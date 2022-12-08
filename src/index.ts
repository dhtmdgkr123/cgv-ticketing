// node v18.12.1

import { Builder, By, Key, WebElement, Capabilities, ThenableWebDriver, until, WebDriver } from 'selenium-webdriver';

import { ServiceBuilder, Options } from 'selenium-webdriver/chrome';
import { join } from 'path';
import { config as dotEnvConfig } from 'dotenv';

const driverPath = join(__dirname , '/../src/', 'chromedriver');

const envPath = join(__dirname, '/../.env');

dotEnvConfig({
    path: envPath
});

const chromeService = new ServiceBuilder(driverPath);
chromeService.addArguments('user-agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Safari/537.36"');

const options = new Options();
options.setPageLoadStrategy('eager');

const driver = new Builder().forBrowser('chrome')
                            .setChromeOptions(options)
                            .setChromeService(chromeService)
                            .build();


const getReserveButton = async () => {
    try {
        const reserveButton = await driver.findElements(By.className('link-reservation'));
        return reserveButton[0];
    } catch (error) {
        console.log('------------------------------------------------');
        console.log(error);
        console.log('------------------------------------------------');

        throw new Error('예매버튼을 찾을 수 없습니다.');
    }
};

const login = async (driver: ThenableWebDriver, id: string, password: string): Promise<WebDriver> => {
    await driver.get('http://www.cgv.co.kr/user/login/?returnURL=http%3A%2F%2Fticket.cgv.co.kr%2FReservation%2FReservation.aspx');
    const userAgent = await driver.executeScript("return navigator.userAgent;");
    
    const [userIdInput, passwordInput, loginButton] = await Promise.all([
        driver.findElement(By.id('txtUserId')),
        driver.findElement(By.id('txtPassword')),
        driver.findElement(By.id('submit'))
    ]);

    await Promise.all([
        userIdInput.sendKeys('dhtmdgkr1231'),
        passwordInput.sendKeys('osh12201!')
    ]);
    await loginButton.sendKeys(Key.ENTER);

    return driver;
};

const selectSpecialCategoryTheater = async (driver: ThenableWebDriver, category: string) => {
    const specialTheaterCategoryVisibleButton = By.css(`#ticket > div.steps > div.step.step1 > div.section.section-movie > div.col-body > div > div.tabmenu > a.button.menu3`);
    await driver.wait(until.elementLocated(specialTheaterCategoryVisibleButton), 100000);
    await driver.findElement(specialTheaterCategoryVisibleButton).click();
    
    const specialTheaterCategories = By.css('#ticket > div.steps > div.step.step1 > div.section.section-movie > div.col-body > div > div.tabmenu > div.tabmenu-selectbox.SPECIALTHEATER > ul > li');
    
    const theaterCategories = await driver.findElements(specialTheaterCategories);

    theaterCategories.forEach(async (theaterCategory) => {
        const detail = (await theaterCategory.getText()).toLowerCase();
        if (detail === category.trim().toLowerCase()) {
            await theaterCategory.click();
        }
    });
};

const selectMovieByName = async (driver: ThenableWebDriver, willWatchMovieName: string, specialCategoryTheater?: string) => {
    await driver.sleep(250);
    const movieImtesSelector = By.css('#movie_list > ul > li');
    const movies = await driver.findElements(movieImtesSelector);
    let selectFlag = false;

    
    movies.forEach(async (movie) => {

        try {
            const moveiElement = await movie.findElement(By.css('a'));
            const movieName = (await moveiElement.getAttribute('title')).trim();
            
            if (movieName === willWatchMovieName) {
                await moveiElement.click();
                return false;
            }

        } catch (e) {
            console.log(e);
        }

    });
    

    // if (! selectFlag) {
    //     throw new Error("영화를 찾을 수 없습니다.");
    // }
    
    if (specialCategoryTheater === null) {
        return;
    }
    
    await driver.sleep(500);
    const specialCategoryTheaterSelector = By.css('#movie_list > ul > div > ul > li');
    const specialCategoryTheaterList = await driver.findElements(specialCategoryTheaterSelector);

    specialCategoryTheaterList.forEach(async (theater) => {

        try {
            
            const categoryElement = await theater.findElement(By.css('a'));
            
            const special = (await categoryElement.getAttribute('innerText')).trim().toLowerCase();
            
            if (special === specialCategoryTheater) {
                await categoryElement.click();
                return false;
            }

        } catch (e) {
            console.log(e);
        }
    });
};

const selectTheater = async (driver: ThenableWebDriver, willVisitRegionName: string, specialCategoryTheater: string) => {
    await driver.sleep(500);

    const regions = await driver.findElements(By.css(`#theater_area_list > ul > li`));

    regions.forEach(async (region) => {
        const regionSelctor = await region.findElement(By.css('a'));
        const regionName = (await regionSelctor.getAttribute('innerText')).trim();

        if (regionName.includes(willVisitRegionName)) {
            await regionSelctor.click();
            return false;
        }
    });
    
    await driver.sleep(500);
    const theaters = await driver.findElements(By.css(`#theater_area_list > ul > li.selected > div > ul > li`));

    theaters.forEach(async (theater) => {

        const areaSelector = await theater.findElement(By.css('a'));
        const areaName = (await areaSelector.getAttribute('innerText')).trim();

        if (areaName === specialCategoryTheater) {
            await areaSelector.click();
        }

    });
    
};

const selectDate = async (driver: ThenableWebDriver, selectDate: string) => {
    await driver.sleep(500);
    const dateSelector = By.css(`#date_list > ul > div > li`);
    const dateLists = await driver.findElements(dateSelector);
    const nowYear = new Date().getFullYear();
    dateLists.forEach(async (date) => {

        const dateText = (await date.getAttribute('date'));
        const willSelectDate = `${nowYear}${selectDate.replace('-', '')}`;

        if (dateText === null) {
            return true;
        }

        if (dateText.trim() === willSelectDate.trim()) {
            const dateSelector = await date.findElement(By.css('a'));
            await dateSelector.click();
            return false;
        }
    });
};

const selectTime = async (driver: ThenableWebDriver, selectHour: number) => {
    await driver.sleep(500);

    const timeSelector = By.css(`#ticket > div.steps > div.step.step1 > div.section.section-time > div.col-body > div.time-list.nano.has-scrollbar > div.content.scroll-y > div > ul > li`);

    const timeTables = await driver.findElements(timeSelector);

    // await driver.wait(until.elementIsVisible(timeTables[0]))

    timeTables.forEach(async (timeTable) => {

        const time = await timeTable.findElement(By.css('a'));
        const reseveItmes = (await time.getAttribute('innerText')).split('\n');
        const startTime = reseveItmes[0].trim().split(':');
        
        if (startTime[0].trim() === `${selectHour}`) {
            await time.click();
            return false;
        }

    });
};

const reserveSeat = async (driver: ThenableWebDriver, willReservedCount: number, rowLabel: string, seatNumber: number[]) => {
    
    await driver.sleep(500);
    await driver.executeScript(`[...document.querySelectorAll('a.layer_close')].forEach(v => v.click())`);

    const capacities = await driver.findElements(By.css(`#nop_group_adult > ul > li`));

    capacities.forEach(async capacity => {
        
        const reserveUserCount = await capacity.findElement(By.css('a'));
        const reserveNumber = Number((await reserveUserCount.getAttribute('textContent')).replace(/[^0-9]/g, ''));

        if (willReservedCount === reserveNumber) {
            await reserveUserCount.click();
            return false;
        }
        
    });


    const seats = await driver.findElements(By.css('#seats_list > div:nth-child(1) > div'));

    seats.forEach(async seat => {
        console.log();
        
    })

};

const gotoSelectSeat = async (driver: ThenableWebDriver) => {
    await driver.sleep(500);
    await driver.findElement(By.id('tnb_step_btn_right')).click();
};

async function main(driver: ThenableWebDriver) {
    
    const wanted = '아바타-물의 길';
    // const wanted = '매드맥스-분노의도로';
    
    // http://www.cgv.co.kr/theaters/?areacode=01&theaterCode=0013&date=20221211
    
    await login(driver, process.env.CGV_LOGIN_ID ?? '', process.env.CGV_LOGIN_PW ?? '');
    await selectSpecialCategoryTheater(driver, 'imax');
    await selectMovieByName(driver, wanted, 'imax');
    await selectTheater(driver, '서울', '용산아이파크몰');
    await selectDate(driver, '12-10'); // 날짜만
    await selectTime(driver, 12); // 시간만
    await gotoSelectSeat(driver);
    await reserveSeat(driver, 2, 'A', [26,27]); // 예약인언, 라벨, 죄석

}

main(driver);
