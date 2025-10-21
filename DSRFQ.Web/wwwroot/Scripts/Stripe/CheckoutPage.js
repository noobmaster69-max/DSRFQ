// CheckoutPage.tsx

import { useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";

// This is your test publishable API key.
const stripePromise = loadStripe(
    "pk_test_51RxN0WLSIf0mjgrcKs5Ydmlk3oe5Zdmo0ltqOZhGdPWsaGZkpJyjFXsNNQnKhUU6nIwQMslmnwJT5Ou0rbOTln2G00u33eDrHt"
);

export default function CheckoutPage() {
    useEffect(() => {
        const initialize = async () => {
            const stripe = await stripePromise;
            if (!stripe) {
                console.error("Stripe failed to initialize.");
                return;
            }

            const fetchClientSecret = async (): Promise<string> => {
                const response = await fetch("/create-checkout-session", {
                    method: "POST",
                });
                const { clientSecret } = await response.json();
                return clientSecret;
            };

            const checkout = await stripe.initEmbeddedCheckout({
                fetchClientSecret,
            });

            checkout.mount("#checkout");
        };

        initialize();
    }, []);

    return <div id="checkout" />;
}
