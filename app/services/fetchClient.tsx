export const fetchSignUp = async (newUser: any) => {
    const data = await fetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(newUser),
        headers: {
            'Content-Type': 'application/json',
        },
    });
    return await data.json();
}

export const fetchTwoFactorEnable = async (totpCode: string) => {
    const data = await fetch(`/api/auth/two-factor/totp/enable`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            totpCode,
        }),
    });
    return await data.json();
}

export const fetchTwoFactorDisable = async (totpCode: string) => {
    const data = await fetch(`/api/auth/two-factor/totp/disable`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            totpCode,
        }),
    });
    return await data.json();
}

export const fetchTwoFactorSetup = async (password: string) => {
    const data = await fetch(`/api/auth/two-factor/totp/setup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            password,
        }),
    });
    const body = await data.json();
    return { body, status: data.status };
}