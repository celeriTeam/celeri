// User
let Users = [
    {
        id: 1,
        name: 'John Doe',
        phoneNumber: '1234567890',
        groups: [1438, 1596]
    },
]

// Groups Database
let Groups = [
    {
        id: 1596,
        name: 'Squad Group',
        members: 4,
        users: Users
    },
    {
        id: 1438,
        name: 'Family Group',
        members: 5,
        users: Users
    }
]

// Temp User APIs
export const getUserName = (id: number): string | undefined => {
    let user = Users.find(user => user.id === id)
    return user?.name
}

export const getUserGroups = (id: number): number[] | undefined => {
    let user = Users.find(user => user.id === id)
    return user?.groups
}

export const getGroupName = (id: number): string | undefined => {
    let group = Groups.find(group => group.id === id)
    return group?.name
}