'use client';

import { Box, Button, Flex, FormControl, FormErrorMessage, Heading, Input, Text, VStack, useToast } from '@chakra-ui/react';
import React, { Dispatch, SetStateAction, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ErrorCode } from '../utils/ErrorCode';
import TwoFactAuth from './TwoFactAuth';

interface SignInProps {
    isSignInMode: boolean;
    setSignInMode: Dispatch<SetStateAction<boolean>>;
}

export default function SignIn(props: SignInProps) {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [totpCode, setTotpCode] = useState('');
    const [showOTP, setShowOTP] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showEmail, setShowEmail] = useState<boolean>(true);
    const toast = useToast();
    const router = useRouter();

    const handleSignIn = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (password) {
            await signIn('credentials', {
                redirect: false,
                email,
                password,
                totpCode,
            })
                .then((response) => {
                    if (response?.ok) {
                        router.replace('/profile');
                        return;
                    }

                    switch (response?.error) {
                        case ErrorCode.IncorrectPassword:
                        case ErrorCode.CredentialsSignin:
                            toast({
                                title: 'Invalid credentials',
                                status: 'error',
                            });
                            return;
                        case ErrorCode.SecondFactorRequired:
                            setShowPassword(false);
                            setShowOTP(true);
                            return;
                    }
                })
                .catch(() => {
                    toast({
                        title: 'Sorry something went wrong',
                        status: 'error',
                    });
                });
        } else {
            setShowEmail(false);
            setShowPassword(true);
        }
    };
    return (
        <Flex h={'100%'} justifyContent={'center'} alignItems={'center'}>
            {props.isSignInMode ? (
                <VStack w={'100%'} spacing={5}>
                    <Heading as="h2" fontFamily={'monospace'} fontWeight={'bolder'}>
                        Sign In
                    </Heading>
                    <form onSubmit={handleSignIn} style={{ width: '75%' }}>
                        <VStack spacing={5} w={'100%'}>
                            {showEmail &&
                                <FormControl isRequired={true}>
                                    <Input type={'email'} placeholder={'Email'} name="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                                    <FormErrorMessage>{email === '' ? 'Email is requi#319795' : 'Invalid email'}</FormErrorMessage>
                                </FormControl>
                            }
                            {showPassword && <FormControl isRequired={true} mb={2}>
                                <Input type={'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                                <FormErrorMessage>Password cannot be less than 8 characters</FormErrorMessage>
                            </FormControl>
                            }
                            {showOTP && <TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} />}
                        </VStack>

                        <Box>
                            {showPassword ?
                                <Button bgColor={'transparent'} fontSize={'0.8rem'} color={'#00000088'} fontFamily={'monospace'} transition={'0.5s'} _hover={{ bgColor: 'transparent', color: '#319795' }}>
                                    <Link href="reset-password">Forgot Password?</Link>
                                </Button>
                                : <br />
                            }
                        </Box>
                        <Flex justifyContent={'center'}>
                            <Button
                                type="submit"
                                borderRadius={'full'}
                                bgColor={'#319795'}
                                fontFamily={'monospace'}
                                color={'white'}
                                _hover={{
                                    bgColor: 'transparent',
                                    color: '#319795',
                                    border: '2px solid #319795',
                                }}
                                w={'60%'}
                            >
                                SIGN IN
                            </Button>
                        </Flex>
                    </form>
                </VStack>
            ) : (
                <Flex h={{ base: '60%', md: '40%' }} px={5} flexDirection={'column'} justifyContent={'space-around'} alignItems={'center'} fontFamily={'monospace'}>
                    <Heading as="h2" color={'white'} fontSize={'2.4rem'} fontWeight={'extrabold'}>
                        Welcome Back!
                    </Heading>
                    <Text fontSize={'1rem'} textAlign={'center'} color={'white'}>
                        To continue your journey with us, please login
                    </Text>
                    <Button
                        border={'2px solid #fff'}
                        borderRadius={'full'}
                        bgColor={'transparent'}
                        color={'white'}
                        w={'50%'}
                        onClick={() => props.setSignInMode(true)}
                        _hover={{ bgColor: '#fff', color: '#319795' }}
                    >
                        SIGN IN
                    </Button>
                </Flex>
            )}
        </Flex>
    );
}
