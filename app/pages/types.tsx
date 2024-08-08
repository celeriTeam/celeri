// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Verification: undefined;
    FLEX: { userID: number };
    CreateGroup: undefined;
    JoinGroup: undefined;
    HomeTab: undefined;
    ProfileTab: { userID: number };
    GroupDetails: { GroupID: number };
};
