import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        # Record video
        context = await browser.new_context(
            record_video_dir="/home/jules/verification/videos/",
            record_video_size={"width": 640, "height": 480}
        )
        page = await context.new_page()
        await page.goto("http://localhost:3000/")

        # Wait a bit to ensure animations run
        await page.wait_for_timeout(5000)

        # Take a screenshot
        await page.screenshot(path="/home/jules/verification/screenshots/verification_final.png", full_page=True)

        await context.close()
        await browser.close()

asyncio.run(main())
