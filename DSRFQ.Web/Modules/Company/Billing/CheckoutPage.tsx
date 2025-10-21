// CheckoutPage.tsx

import { useEffect } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";
import {resolveUrl, serviceCall, stringFormat} from "@serenity-is/corelib";
import {useRef} from "jsx-dom";

// This is your test publishable API key.
const stripePromise = loadStripe(
    "pk_test_51RxN0WLSIf0mjgrcKs5Ydmlk3oe5Zdmo0ltqOZhGdPWsaGZkpJyjFXsNNQnKhUU6nIwQMslmnwJT5Ou0rbOTln2G00u33eDrHt"
);
export function CheckoutPage() {
    const initialized = useRef(false);

    if (!initialized.current) {
        initialized.current = true;

        (async () => {
            const stripe = await stripePromise;
            if (!stripe) {
                console.error("Stripe failed to initialize.");
                return;
            }

            const fetchClientSecret = async (): Promise<string> => {
                return new Promise((resolve, reject) => {
                    serviceCall({
                        url: resolveUrl("/create-checkout-session"),
                        request: {},  
                        onSuccess: (response: { clientSecret: string }) => {
                            resolve(response.clientSecret);
                        },
                        onError: (err) => {
                            console.error("Error creating checkout session", err);
                            reject(err);
                        }
                    });
                });
            };

            const checkout = await stripe.initEmbeddedCheckout({
                fetchClientSecret,
            });

            checkout.mount("#checkout");
        })();
    }

    return <div id="checkout" />;
}


export default function pageInit({ nwLinkFormat }: { nwLinkFormat: string }) {
    const nwLink = (s: string) => stringFormat(nwLinkFormat, s);

    return <CheckoutPage />;
}
