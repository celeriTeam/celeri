// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Login: undefined;
    Verification: undefined;
    HomePage: undefined;
    CreateGroup: { userID: string };
    InviteGroup: { groupID: string, fromCreate: boolean };
    JoinGroup: { userID: string };
    HomeTab: { userID: string };
    BugReportsPage: undefined;
    ProfileTab: { userID: string };
    GroupDetails: { groupID: string };
    EditProfile: { userID: string, profilePic: string, username: string };
};
