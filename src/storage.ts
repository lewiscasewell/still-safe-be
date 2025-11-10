type StoredCredential = {
    userId: string
    credentialID: string
    credentialPublicKey: string
    counter: number
}

// In-memory store
const credentials = new Map<string, StoredCredential>()

export function saveCredential({
    userId,
    credentialID,
    credentialPublicKey,
    counter,
}: StoredCredential) {
    credentials.set(userId, {
        userId,
        credentialID,
        credentialPublicKey,
        counter,
    })
}

export function getCredential(userId: string): StoredCredential {
    const cred = credentials.get(userId)
    if (!cred) throw new Error('Credential not found')
    return cred
}

export function updateCounter(userId: string, newCounter: number) {
    const cred = credentials.get(userId)
    if (!cred) throw new Error('Credential not found')

    credentials.set(userId, {
        ...cred,
        counter: newCounter,
    })
}
