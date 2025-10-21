using Serenity.Navigation;
using MyPages = DSRFQ.Wallet.Pages;

[assembly: NavigationLink(int.MaxValue, "Administration/Wallet/Wallet Transaction Items", typeof(MyPages.WalletTransactionItemsPage), icon: "fa-wallet")]
[assembly: NavigationLink(int.MaxValue, "Administration/Wallet/Wallet Transactions", typeof(MyPages.WalletTransactionsPage), icon: "fa-wallet")]