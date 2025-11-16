import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { toast } from "sonner";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_test_placeholder");

interface PaymentFormProps {
  amount: number;
  missionId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function PaymentFormInner({ amount, missionId, onSuccess, onCancel }: PaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) {
      // Mock payment flow if Stripe is not configured
      setProcessing(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_CORE_API_URL || "http://localhost:4000"}/api/payments/create-intent`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: Math.round(amount * 100), missionId }),
        });
        const data = await response.json();
        
        // If mock client secret, simulate success
        if (data.clientSecret?.startsWith("mock_")) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          toast.success("Payment successful (mock mode)");
          onSuccess?.();
          return;
        }
      } catch (error: any) {
        toast.error(error.message || "Payment processing failed");
      } finally {
        setProcessing(false);
      }
      return;
    }

    setProcessing(true);
    try {
      // Create payment intent on backend
      const response = await fetch(`${import.meta.env.VITE_CORE_API_URL || "http://localhost:4000"}/api/payments/create-intent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Math.round(amount * 100), missionId }),
      });

      const { clientSecret } = await response.json();

      // Handle mock payments
      if (clientSecret?.startsWith("mock_")) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        toast.success("Payment successful (mock mode)");
        onSuccess?.();
        return;
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      });

      if (error) {
        toast.error(error.message || "Payment failed");
      } else if (paymentIntent?.status === "succeeded") {
        toast.success("Payment successful");
        onSuccess?.();
      }
    } catch (error: any) {
      toast.error(error.message || "Payment processing failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Card Details</Label>
        <div className="p-3 border rounded-lg bg-background">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#fff",
                  "::placeholder": { color: "#a0a0a0" },
                },
                invalid: { color: "#ef4444" },
              },
            }}
          />
        </div>
      </div>
      <div className="flex items-center justify-between pt-2">
        <div>
          <div className="text-sm text-muted-foreground">Total Amount</div>
          <div className="text-2xl font-bold">${amount.toFixed(2)}</div>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={!stripe || processing}>
            {processing ? "Processing..." : `Pay $${amount.toFixed(2)}`}
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock className="h-3 w-3" />
        <span>Secure payment powered by Stripe</span>
      </div>
    </form>
  );
}

export function PaymentForm(props: PaymentFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment
        </CardTitle>
        <CardDescription>Complete your payment to confirm the mission</CardDescription>
      </CardHeader>
      <CardContent>
        <Elements stripe={stripePromise}>
          <PaymentFormInner {...props} />
        </Elements>
      </CardContent>
    </Card>
  );
}

