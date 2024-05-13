'use client';

import React from 'react'
import { Button } from '@chakra-ui/react';
import { signOut } from 'next-auth/react';
import TwoFactSettings from '@/components/TwoFactSettings';

const content = (props: any) => {
    const { user } = props;
    return (
        <>
            <TwoFactSettings user={user} />
            <Button
                my={5}
                borderRadius={'full'}
                bgColor={'#319795'}
                fontFamily={'monospace'}
                color={'white'}
                w={'60%'}
                mx={'auto'}
                _hover={{
                    bgColor: 'transparent',
                    color: '#319795',
                    border: '2px solid #319795',
                }}
                onClick={() => signOut()}
            >
                Sign Out
            </Button>
        </>
    )
}

export default content