// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Login: undefined;
    Verification: undefined;
    HomePage: undefined;
    CreateGroup: undefined;
    JoinGroup: undefined;
    HomeTab: undefined;
    ProfileTab: { userID: string };
    GroupDetails: { GroupID: string };
};
