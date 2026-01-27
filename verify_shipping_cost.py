
import re
from playwright.sync_api import Page, expect

def test_shipping_cost_calculation(page: Page):
    # 1. Log in
    page.goto("http://127.0.0.1:8000/login")
    page.get_by_placeholder("email").fill("admin@example.com")
    page.get_by_placeholder("Password").fill("password")
    page.get_by_role("button", name="Login").click()
    expect(page).to_have_url("http://127.0.0.1:8000/")

    # 2. Add a product to the cart
    page.goto("http://127.0.0.1:8000/")
    # Click on the product link that contains the text "Sample Product"
    page.locator('a:has-text("Sample Product")').first.click()
    page.get_by_role("button", name="Add to Cart").click()
    page.goto("http://127.0.0.1:8000/cart")

    # 3. Proceed to checkout and create a shipping address
    page.get_by_role("link", name="PROCEED TO CHECKOUT").click()
    page.get_by_role("button", name="New Address").click()

    page.get_by_label("Address Type").select_option("shipping")
    page.get_by_label("First Name").fill("Test")
    page.get_by_label("Last Name").fill("User")
    page.get_by_label("Address Line 1").fill("123 Main St")
    page.get_by_label("City").fill("Paris")
    page.get_by_label("Postal Code").fill("75001")
    page.get_by_label("Country").select_option("FR")
    page.get_by_role("button", name="Save Address").click()

    # 4. Proceed to the shipping methods page
    page.get_by_role("link", name="PROCEED TO CHECKOUT").click()
    expect(page).to_have_url("http://127.0.0.1:8000/checkout/shipping-methods")

    # 5. Assert that the shipping cost is calculated correctly for France (Europe zone)
    # The base cost for Europe is €7.00, as seen in the user-provided screenshot.
    shipping_cost_element = page.locator("#shipping")
    expect(shipping_cost_element).to_have_text("€7.00")
