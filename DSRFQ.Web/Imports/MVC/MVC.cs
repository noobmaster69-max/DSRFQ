
namespace DSRFQ;

public static partial class MVC
{
    public static partial class Views
    {
        public static partial class Common
        {
            public static partial class Dashboard
            {
                public const string DashboardIndex = "~/Modules/Common/Dashboard/DashboardIndex.cshtml";
            }
        }

        public static partial class Company
        {
            public static partial class Billing
            {
                public const string BillingIndex = "~/Modules/Company/Billing/BillingIndex.cshtml";
                public const string CheckoutIndex = "~/Modules/Company/Billing/CheckoutIndex.cshtml";
                public const string ReturnIndex = "~/Modules/Company/Billing/ReturnIndex.cshtml";
            }

            public static partial class Organization
            {
                public const string OrganizationDetailIndex = "~/Modules/Company/Organization/OrganizationDetailIndex.cshtml";
            }
        }

        public static partial class Costing
        {
            public static partial class Drawing
            {
                public const string DrawingIndex = "~/Modules/Costing/Drawing/DrawingIndex.cshtml";
            }
        }

        public static partial class Errors
        {
            public const string AccessDenied = "~/Views/Errors/AccessDenied.cshtml";
            public const string ValidationError = "~/Views/Errors/ValidationError.cshtml";
        }

        public static partial class Membership
        {
            public static partial class Account
            {
                public static partial class Invitation
                {
                    public const string InviteEmail = "~/Modules/Membership/Account/Invitation/InviteEmail.cshtml";
                }

                public static partial class Login
                {
                    public const string _ActivationComplete = "~/Modules/Membership/Account/Login/_ActivationComplete.cshtml";
                    public const string _StoreLinks = "~/Modules/Membership/Account/Login/_StoreLinks.cshtml";
                    public const string LoginPage = "~/Modules/Membership/Account/Login/LoginPage.cshtml";
                }

                public static partial class SignUp
                {
                    public const string ActivateEmail = "~/Modules/Membership/Account/SignUp/ActivateEmail.cshtml";
                    public const string SignUpPage = "~/Modules/Membership/Account/SignUp/SignUpPage.cshtml";
                }
            }
        }

        public static partial class Shared
        {
            public const string _Layout = "~/Views/Shared/_Layout.cshtml";
            public const string _LayoutHead = "~/Views/Shared/_LayoutHead.cshtml";
            public const string _LayoutNoNavigation = "~/Views/Shared/_LayoutNoNavigation.cshtml";
            public const string _Sidebar = "~/Views/Shared/_Sidebar.cshtml";
            public const string Error = "~/Views/Shared/Error.cshtml";
        }
    }
}