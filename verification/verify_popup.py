from playwright.sync_api import sync_playwright
import os

def verify_popup():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Determine absolute path to popup.html
        # Assuming we are in root
        popup_path = os.path.abspath("popup.html")
        page.goto(f"file://{popup_path}")

        # Wait for content
        page.wait_for_selector(".app")

        # Take screenshot
        page.screenshot(path="verification/popup.png")
        print("Screenshot saved to verification/popup.png")
        browser.close()

if __name__ == "__main__":
    verify_popup()
