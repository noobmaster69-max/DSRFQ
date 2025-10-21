import { proxyTexts } from "@serenity-is/corelib";

namespace texts {

    export declare namespace Db {

        namespace Administration {

            namespace Language {
                export const LanguageId: string;
                export const LanguageName: string;
            }

            namespace Role {
                export const RoleId: string;
                export const RoleKey: string;
                export const RoleKeyOrName: string;
                export const RoleName: string;
            }

            namespace RolePermission {
                export const PermissionKey: string;
                export const RoleId: string;
                export const RoleKeyOrName: string;
                export const RolePermissionId: string;
            }

            namespace User {
                export const CompanyGroupList: string;
                export const CompanyId: string;
                export const CompanyName: string;
                export const DisplayName: string;
                export const Email: string;
                export const GroupId: string;
                export const GroupName: string;
                export const ImpersonationToken: string;
                export const InsertDate: string;
                export const InsertUserId: string;
                export const InvitedByUserId: string;
                export const IsActive: string;
                export const LastDirectoryUpdate: string;
                export const MobilePhoneNumber: string;
                export const Password: string;
                export const PasswordConfirm: string;
                export const Roles: string;
                export const Source: string;
                export const UpdateDate: string;
                export const UpdateUserId: string;
                export const UserId: string;
                export const UserImage: string;
                export const UserInvitationId: string;
                export const Username: string;
            }

            namespace UserInvitations {
                export const Accepted: string;
                export const DeleteBy: string;
                export const DeleteDate: string;
                export const DeleteUserId: string;
                export const EmailAddress: string;
                export const Id: string;
                export const InsertBy: string;
                export const InsertDate: string;
                export const InsertUserId: string;
                export const InvitedByUserId: string;
                export const InvitedByUserName: string;
                export const IsActive: string;
                export const UpdateBy: string;
                export const UpdateDate: string;
                export const UpdateUserId: string;
            }

            namespace UserPermission {
                export const Granted: string;
                export const PermissionKey: string;
                export const User: string;
                export const UserId: string;
                export const UserPermissionId: string;
                export const Username: string;
            }

            namespace UserRole {
                export const RoleId: string;
                export const RoleKeyOrName: string;
                export const User: string;
                export const UserId: string;
                export const UserRoleId: string;
                export const Username: string;
            }
        }

        namespace Company {

            namespace Companies {
                export const CompanyGroupList: string;
                export const DeleteBy: string;
                export const DeleteDate: string;
                export const DeleteUserId: string;
                export const GroupId: string;
                export const GroupName: string;
                export const Id: string;
                export const InsertBy: string;
                export const InsertDate: string;
                export const InsertUserId: string;
                export const IsActive: string;
                export const Name: string;
                export const OrganizationId: string;
                export const Picture: string;
                export const UpdateBy: string;
                export const UpdateDate: string;
                export const UpdateUserId: string;
            }

            namespace CompanyGroups {
                export const CompanyId: string;
                export const CompanyName: string;
                export const DeleteBy: string;
                export const DeleteDate: string;
                export const DeleteUserId: string;
                export const GroupId: string;
                export const GroupName: string;
                export const Id: string;
                export const InsertBy: string;
                export const InsertDate: string;
                export const InsertUserId: string;
                export const IsActive: string;
                export const UpdateBy: string;
                export const UpdateDate: string;
                export const UpdateUserId: string;
            }

            namespace Groups {
                export const CompanyList: string;
                export const DeleteBy: string;
                export const DeleteDate: string;
                export const DeleteUserId: string;
                export const Description: string;
                export const Id: string;
                export const InsertBy: string;
                export const InsertDate: string;
                export const InsertUserId: string;
                export const IsActive: string;
                export const Name: string;
                export const UpdateBy: string;
                export const UpdateDate: string;
                export const UpdateUserId: string;
            }
        }

        namespace Wallet {

            namespace WalletTransactionItems {
                export const AmountDiscount: string;
                export const AmountSubtotal: string;
                export const AmountTax: string;
                export const AmountTotal: string;
                export const Currency: string;
                export const DeleteBy: string;
                export const DeleteDate: string;
                export const DeleteUserId: string;
                export const Description: string;
                export const Id: string;
                export const InsertBy: string;
                export const InsertDate: string;
                export const InsertUserId: string;
                export const IsActive: string;
                export const ItemId: string;
                export const PriceId: string;
                export const ProductId: string;
                export const Quantity: string;
                export const UpdateBy: string;
                export const UpdateDate: string;
                export const UpdateUserId: string;
                export const WalletTransactionId: string;
                export const WalletTransactionStripeSessionId: string;
            }

            namespace WalletTransactions {
                export const Amount: string;
                export const CompanyId: string;
                export const CompanyName: string;
                export const Currency: string;
                export const CustomerEmail: string;
                export const CustomerName: string;
                export const DeleteBy: string;
                export const DeleteDate: string;
                export const DeleteUserId: string;
                export const Id: string;
                export const InsertBy: string;
                export const InsertDate: string;
                export const InsertUserId: string;
                export const IsActive: string;
                export const PaymentStatus: string;
                export const Status: string;
                export const StripeInvoiceId: string;
                export const StripeInvoiceUrl: string;
                export const StripePaymentIntentId: string;
                export const StripeSessionId: string;
                export const UpdateBy: string;
                export const UpdateDate: string;
                export const UpdateUserId: string;
                export const UserId: string;
            }
        }
    }

    export declare namespace Forms {

        namespace Membership {

            namespace Login {
                export const ForgotPassword: string;
                export const LoginToYourAccount: string;
                export const OR: string;
                export const RememberMe: string;
                export const SignInButton: string;
                export const SignInWithGeneric: string;
                export const SignUpButton: string;
            }

            namespace SignUp {
                export const ActivateEmailSubject: string;
                export const ActivationCompleteMessage: string;
                export const ConfirmDetails: string;
                export const ConfirmEmail: string;
                export const ConfirmPassword: string;
                export const DisplayName: string;
                export const Email: string;
                export const FormInfo: string;
                export const FormTitle: string;
                export const Password: string;
                export const SubmitButton: string;
                export const Success: string;
            }
        }
        export const SiteTitle: string;
    }

    export declare namespace Site {

        namespace AccessDenied {
            export const ClickToChangeUser: string;
            export const ClickToLogin: string;
            export const LackPermissions: string;
            export const NotLoggedIn: string;
            export const PageTitle: string;
        }

        namespace Layout {
            export const Language: string;
            export const Theme: string;
        }

        namespace RolePermissionDialog {
            export const DialogTitle: string;
            export const EditButton: string;
            export const SaveSuccess: string;
        }

        namespace UserDialog {
            export const EditPermissionsButton: string;
            export const EditRolesButton: string;
        }

        namespace UserPermissionDialog {
            export const DialogTitle: string;
            export const Grant: string;
            export const Permission: string;
            export const Revoke: string;
            export const SaveSuccess: string;
        }

        namespace ValidationError {
            export const Title: string;
        }
    }

    export declare namespace Validation {
        export const AuthenticationError: string;
        export const CurrentPasswordMismatch: string;
        export const DeleteForeignKeyError: string;
        export const EmailConfirm: string;
        export const EmailInUse: string;
        export const InvalidActivateToken: string;
        export const InvalidResetToken: string;
        export const MinRequiredPasswordLength: string;
        export const PasswordConfirmMismatch: string;
        export const SavePrimaryKeyError: string;
    }

}

const Texts: typeof texts = proxyTexts({}, '', {
    Db: {
        Administration: {
            Language: {},
            Role: {},
            RolePermission: {},
            User: {},
            UserInvitations: {},
            UserPermission: {},
            UserRole: {}
        },
        Company: {
            Companies: {},
            CompanyGroups: {},
            Groups: {}
        },
        Wallet: {
            WalletTransactionItems: {},
            WalletTransactions: {}
        }
    },
    Forms: {
        Membership: {
            Login: {},
            SignUp: {}
        }
    },
    Site: {
        AccessDenied: {},
        Layout: {},
        RolePermissionDialog: {},
        UserDialog: {},
        UserPermissionDialog: {},
        ValidationError: {}
    },
    Validation: {}
}) as any;

export const AccessDeniedViewTexts = Texts.Site.AccessDenied;

export const LoginFormTexts = Texts.Forms.Membership.Login;

export const MembershipValidationTexts = Texts.Validation;

export const RolePermissionDialogTexts = Texts.Site.RolePermissionDialog;

export const SignUpFormTexts = Texts.Forms.Membership.SignUp;

export const SiteFormTexts = Texts.Forms;

export const SiteLayoutTexts = Texts.Site.Layout;

export const SqlExceptionHelperTexts = Texts.Validation;

export const UserDialogTexts = Texts.Site.UserDialog;

export const UserPermissionDialogTexts = Texts.Site.UserPermissionDialog;

export const ValidationErrorViewTexts = Texts.Site.ValidationError;