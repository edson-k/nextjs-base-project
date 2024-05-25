'use client'

import {
    Button,
    Flex,
    FormControl,
    FormErrorMessage,
    Input,
    Text,
    useToast,
    VStack,
} from '@chakra-ui/react';
import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchSendActivation } from '@/app/services/fetchClient';

const Content = (props: any) => {
    const { data, token } = props;

    const [email, setEmail] = useState<string>('');
    const [touched, setTouched] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<string>(data.message);
    const [success, setSuccess] = useState<boolean>(data.success);
    const toast = useToast();
    const router = useRouter();

    if (success) setTimeout(() => router.replace('/'), 2000);

    const sendActivationLink = async () => {
        setIsLoading(true);
        const resp = await fetchSendActivation({ email });
        const data = await resp.json();
        if (data.success) {
            toast({
                title: 'Activation link sent',
                status: 'success',
            });
            setMessage(data.message);
        } else {
            toast({
                title: 'Sorry something went wrong',
                description: data.message,
                status: 'error',
            });
            setMessage(data.message);
        }
        setIsLoading(false);
        setEmail('');
        setSuccess(true);
    }

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        const sendActivation = {
            tokenId: token,
            email,
        };

        await fetch('/api/account/sendActivation', {
            method: 'PUT',
            body: JSON.stringify(sendActivation),
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        })
            .then(async (res) => {
                const data = await res.json();
                if (res.status === 200) {
                    // setMessage(data.message);
                    router.replace('/');
                } else {
                    // setMessage(data.message || 'An error occurred');
                    if (data.success === false) {
                        // setShowLinkReSend(true);
                    }
                }
                // setShowLink(true);
            })
            .catch((error) => console.log('Error: ', error));
    };

    return (
        <Flex
            w={'60%'}
            h={'60vh'}
            mx="auto"
            justifyContent={'center'}
            alignItems={'center'}
        >
            <VStack spacing={5} w={'100%'}>
                <Text textAlign={'center'}>{message}</Text>
                {!success ?
                    <>
                        <form onSubmit={handleSubmit}>
                            <FormControl isRequired isInvalid={touched && email === ''} mb={2}>
                                <Input
                                    type={'email'}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder={'E-Mail'}
                                    minLength={8}
                                    w={'100%'}
                                    onBlur={() => setTouched(true)}
                                />
                                <FormErrorMessage>E-Mail is required</FormErrorMessage>
                            </FormControl>
                            <Button
                                type={'submit'}
                                w={'100%'}
                                colorScheme={'blue'}
                                onClick={() => sendActivationLink()}
                                isLoading={isLoading}
                                isDisabled={!email}
                            >
                                Resend activation link
                            </Button>
                        </form>
                        <Text color={'#00000088'} _hover={{ color: 'blue.400' }}>
                            <Link href={'/'}>Back to Login</Link>
                        </Text>
                    </>
                    : ''
                }
            </VStack>
        </Flex>
    )
}

export default Content