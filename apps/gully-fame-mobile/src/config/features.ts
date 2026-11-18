// App-wide feature switches. Flip a value to true to bring the feature back;
// the code behind each switch is kept as it is.

// Buying GFI coins (Razorpay). Off for launch: competition entry is free, so
// users have no need to buy coins. Turn on only after the Play Store payments
// decision (Play Billing) is made.
export const COIN_PURCHASE_ENABLED = false;

// Tipping creators with coins. On: users tip with coins they earned
// (daily missions, prizes). The backend limits tips per day.
export const TIPPING_ENABLED = true;

// Coins a user needs before they can withdraw. Withdrawals are not built yet;
// the app only shows this goal.
export const WITHDRAW_MIN_COINS = 1000;

// Shown when a user has too few coins and cannot buy more.
export const EARN_COINS_MESSAGE = "Not enough coins. Earn coins by completing daily missions.";

export const withdrawMessage = (balance: number) =>
  balance >= WITHDRAW_MIN_COINS
    ? "You've reached the withdrawal goal. Withdrawals are coming soon, and your coins are safe in your wallet."
    : `You can withdraw once you have ${WITHDRAW_MIN_COINS.toLocaleString()} GFI coins. You have ${Math.floor(Math.max(0, balance)).toLocaleString()} now. Withdrawals are coming soon.`;
