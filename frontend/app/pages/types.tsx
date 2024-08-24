// types.ts
export type RootStackParamList = {
    Register: undefined;
    SignUp: undefined;
    Login: undefined;
    Verification: undefined;
    HomePage: undefined;
    CreateGroup: undefined;
    InviteGroup: {groupID: string};
    JoinGroup: undefined;
    HomeTab: undefined;
    BugReportsPage: undefined;
    ProfileTab: { userID: string };
    GroupDetails: { GroupName: string };
    EditProfile: { userID: string, profilePic: string, username: string };
};
