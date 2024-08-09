// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Login: undefined;
    Verification: undefined;
    FLEX: { userID: string };
    CreateGroup: undefined;
    JoinGroup: undefined;
    HomeTab: undefined;
    ProfileTab: { userID: number };
    GroupDetails: { GroupID: string };
};
