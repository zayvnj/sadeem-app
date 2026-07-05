from playwright.sync_api import sync_playwright

def run_cuj(page):
    page.goto("http://localhost:3000")
    page.wait_for_timeout(2000)

    # We need to simulate being logged in to see the profile.
    # Since we can't easily do NextAuth without a real user, we will just visit the profile component if possible,
    # but let's see what localhost:3000 shows first.
    page.screenshot(path="/home/jules/verification/screenshots2/verification.png")
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="/home/jules/verification/videos2"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
