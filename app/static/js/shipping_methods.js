document.addEventListener('DOMContentLoaded', () => {
    const shippingMethods = document.querySelectorAll('input[name="shipping_method"]');
    const subtotalEl = document.getElementById('subtotal');
    const discountEl = document.getElementById('discount');
    const shippingEl = document.getElementById('shipping');
    const vatEl = document.getElementById('vat-amount');
    const totalEl = document.getElementById('total-due');

    const originalShippingCost = parseFloat(shippingEl.textContent.replace('€', ''));
    const subtotal = parseFloat(subtotalEl.textContent.replace('€', ''));
    const discount = discountEl ? parseFloat(discountEl.textContent.replace('-€', '').replace('€', '')) : 0;
    const vat = parseFloat(vatEl.textContent.replace('€', ''));

    shippingMethods.forEach(method => {
        method.addEventListener('change', () => {
            let newShippingCost = originalShippingCost;
            if (method.value === 'express') {
                newShippingCost *= 1.25;
            } else if (method.value === 'economic') {
                newShippingCost *= 0.9;
            }

            const newTotal = subtotal - discount + newShippingCost + vat;

            shippingEl.textContent = `€${newShippingCost.toFixed(2)}`;
            totalEl.textContent = `€${newTotal.toFixed(2)}`;

            // Update UI feedback for selected card
            shippingMethods.forEach(m => {
                const card = m.closest('.card');
                if (card) {
                    if (m.checked) {
                        card.classList.add('border-primary', 'bg-light');
                    } else {
                        card.classList.remove('border-primary', 'bg-light');
                    }
                }
            });

            sessionStorage.setItem('shipping_method', method.value);
            sessionStorage.setItem('shipping_cost', newShippingCost.toFixed(2));
            sessionStorage.setItem('total', newTotal.toFixed(2));
        });
    });

    document.getElementById('proceed-to-checkout').addEventListener('click', (e) => {
        e.preventDefault();
        const shippingMethod = sessionStorage.getItem('shipping_method');
        const shippingCost = sessionStorage.getItem('shipping_cost');
        const total = sessionStorage.getItem('total');

        console.log('Shipping Method:', shippingMethod);
        console.log('Shipping Cost:', shippingCost);
        console.log('Total:', total);

        // For now, just log the values. In the future, this would navigate to the payment page.
        alert(`Shipping Method: ${shippingMethod}\nShipping Cost: €${shippingCost}\nTotal: €${total}`);
    });
});
