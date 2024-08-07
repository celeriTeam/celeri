// User
let Users = [
    {
        id: 1,
        name: 'John Doe',
        phoneNumber: '1234567890',
        groups: [1596]
    },
]

// Groups Database
let Groups = [
    {
        id: 1596,
        name: 'Squad',
        members: 4,
        users: Users
    },
]

// Temp User APIs
function getUserName(id: number) {
    let user = Users.find(user => user.id === id)
    return user?.name
}

function getUserGroups(id: number) {
    let user = Users.find(user => user.id === id)
    return user?.groups
}