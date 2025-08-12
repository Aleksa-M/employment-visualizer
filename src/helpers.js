export function nameToIdentifier(name) {
    let arr = name.split("_");
    return {
        identity: arr[0],
        gender: arr[1],
        educaiton: arr[2],
        age: arr[3]
    };
}

export function identifierToName(identifier) {
    return `${identifier.identity}_${identifier.gender}_${identifier.education}_${identifier.age}`;
}

export function nameToReadable(name) {
    let arr = name.split("_");
    let readable = ""
    // identity
    switch (arr[2]) {
        case ("total"):
            break;
    }
}
