'use client';

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
import Link from 'next/link';
import React, { useState } from 'react';
import { fetchResetPassword } from '@/app/services/fetchClient';

export default function ResetPassword() {
    const [email, setEmail] = useState<string>('');
    const [touched, setTouched] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const toast = useToast();

    const handleSubmit = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        setIsLoading(true);

        await fetchResetPassword(email, 'POST')
            .then(async (res) => {
                const data = await res.json();
                if (res.status === 200) {
                    setIsLoading(false);
                    toast({
                        title: 'Message Sent',
                        status: 'success',
                        duration: 2000,
                        position: 'top',
                    });
                } else {
                    setIsLoading(false);
                    toast({
                        title: 'Error',
                        description: data?.message || 'An error occurred',
                        status: 'error',
                        duration: 2000,
                        position: 'top',
                    });
                }
            })
            .catch((error) => {
                setIsLoading(false);
                toast({
                    title: 'Error',
                    description: error?.message || 'An error occurred',
                    status: 'error',
                    duration: 2000,
                    position: 'top',
                });
                console.log('Error: ', error);
            });
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
                <Text textAlign={'center'}>
                    Enter the email address associated with your account, and we will send
                    you a link to reset your password
                </Text>
                <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                    <FormControl isRequired isInvalid={touched && email === ''} mb={2}>
                        <Input
                            type={'email'}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={'Enter your email address'}
                            w={'100%'}
                            onBlur={() => setTouched(true)}
                        />
                        <FormErrorMessage>Email is required</FormErrorMessage>
                    </FormControl>
                    <Button
                        type={'submit'}
                        w={'100%'}
                        colorScheme={'blue'}
                        isLoading={isLoading}
                        isDisabled={!email}
                    >
                        Send Email
                    </Button>
                </form>
                <Text color={'#00000088'} _hover={{ color: 'blue.400' }}>
                    <Link href={'/'}>Back to Login</Link>
                </Text>
            </VStack>
        </Flex>
    );
}
