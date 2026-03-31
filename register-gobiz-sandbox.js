const clientId = "P7hsgc4ucfjpFkFd";
const clientSecret = "6lhxA3vgtLBnuyCL4sCI6idaQQY7WmWM";
const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

async function run() {
  try {
    const tokenRes = await fetch("https://integration-goauth.gojekapi.com/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${authString}`
      },
      body: new URLSearchParams({
        "grant_type": "client_credentials"
      })
    });
    
    const tokenData = await tokenRes.json();
    
    console.log("Registering payment webhook to sandbox...");
    const subRes = await fetch("https://api.partner-sandbox.gobiz.co.id/integrations/partner/v1/notification-subscriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${tokenData.access_token}`
      },
      body: JSON.stringify({
        "event": "payment.transaction.settlement",
        "url": "https://app.crownallstar.com/api/gobiz-webhook"
      })
    });

    console.log("Subscription status:", subRes.status);
    console.log("Subscription response:", await subRes.text());
  } catch (err) {
    console.error("Error:", err);
  }
}
run();
