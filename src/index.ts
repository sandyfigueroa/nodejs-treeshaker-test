const puppeteer = require('puppeteer');
const fs = require('fs');
const express = require('express');
const app = express();
const PORT = process.env.PORT || 5000;

app.get('/api/', async (req: any, res: any) => {
    const response = await run(req.query['url']);
    res.status(200).json(response);
});

(async () => {
    app.listen(PORT, () => {
        console.log(`Listening at http://localhost:${PORT}`)
    })
})();



async function run(pageUrl: string, cached: boolean = true) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox"],
        // userDataDir: './userdata',
        // dumpio: true
    });
    const page = await browser.newPage();
    await page.setCacheEnabled(cached);
    await page.setViewport({
        width: 1500,
        height: 800
    });
    await page.setRequestInterception(true);
    page.on('request', (req: any) => {
        if ((req.resourceType() !== 'script' && req.resourceType() !== 'stylesheet' && req.resourceType() !== 'document') ||
            (req.resourceType() === 'script' && req.initiator().type === 'script')) {
            req.abort();
        }
        else {
            req.continue();
        }
    });
    await Promise.all([
        page.coverage.startCSSCoverage()
    ]);

    try {
        await page.goto(pageUrl, {
            waitUntil: 'networkidle2',
            timeout: 6000
        });
    } catch (e: any) {
        await browser.close();
        return {
            code: 500,
            error: e.name,
            message: e.message
        }
    }


    const cssCoverage = await Promise.all([
        page.coverage.stopCSSCoverage(),
    ]);

    const css_coverage = [...cssCoverage];
    let covered_css = "";
    for (const entry of css_coverage[0]) {
        for (const range of entry.ranges) {
            covered_css += entry.text.slice(range.start, range.end) + "\n";
        }
    }
    fs.writeFile("./used.css", covered_css, function (err: any) {
        if (err) {
            return console.log(err);
        }
        console.log("The file was saved!");
    });

    await browser.close();
    return {
        code: 200,
        done: true
    }
}



// run('https://wp-rocket.com/?nowprocket', false);