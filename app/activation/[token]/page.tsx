

import React from 'react';
import Content from '@/app/activation/[token]/components/content';
import { fetchActivation } from '@/app/services/fetchServer';

interface Props {
    params: {
        token: string
    }
}

export default async function ActivationAccount({ params: { token } }: Props) {

    const newPassword = {
        tokenId: token,
    };

    const data = await fetchActivation(newPassword);

    return (
        <Content data={data} token={token} />
    );
}
