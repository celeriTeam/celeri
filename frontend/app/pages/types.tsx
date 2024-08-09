// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Login: undefined;
    Verification: undefined;
    FLEX: { userID: string };
    CreateGroup: { userID: string };
    JoinGroup: undefined;
    HomeTab: undefined;
    ProfileTab: { userID: string };
    GroupDetails: { GroupID: string };
};
