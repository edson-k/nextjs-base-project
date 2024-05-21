'use client';

import { Box, Button, Flex, FormControl, FormErrorMessage, Heading, Input, InputGroup, InputLeftAddon, Text, VStack, useToast } from '@chakra-ui/react';
import { AiTwotoneMail } from "react-icons/ai";
import { TbPasswordUser } from "react-icons/tb";
import React, { Dispatch, SetStateAction, useRef, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ErrorCode } from '@/utils/ErrorCode';
import TwoFactAuth from '@/components/TwoFactAuth';
import RecoveryCode from '@/components/RecoveryCode';
import InputUtil from '@/utils/input';
import { set } from 'mongoose';

interface SignInProps {
    isSignInMode: boolean;
    setSignInMode: Dispatch<SetStateAction<boolean>>;
}

export default function SignIn(props: SignInProps) {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [totpCode, setTotpCode] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [showOTP, setShowOTP] = useState<boolean>(false);
    const [showRecoveryCode, setShowRecoveryCode] = useState<boolean>(false);
    const [showPassword, setShowPassword] = useState<boolean>(false);
    const [showEmail, setShowEmail] = useState<boolean>(true);
    const toast = useToast();
    const router = useRouter();

    const inputRefEmail: any = useRef(null);
    const inputRefPassword: any = useRef(null);
    const inputRefTotpCode: any = useRef(null);
    const inputRefRecoveryCode: any = useRef(null);

    const recoveryCodeEvent = (event: any) => {
        event.preventDefault();
        setRecoveryCode('');
        setShowOTP(false);
        setShowRecoveryCode(true);
    }

    const twoFactAuthEvent = (event: any) => {
        event.preventDefault();
        setRecoveryCode('');
        setShowRecoveryCode(false);
        setShowOTP(true);
    }

    const signInEvent = () => {
        props.setSignInMode(true);
        setShowEmail(true);
        setEmail('');
        setShowPassword(false);
        setPassword('');
        setShowOTP(false);
        setTotpCode('');
        setShowRecoveryCode(false);
        setRecoveryCode('');
        InputUtil.focus(inputRefEmail);
    }

    const handleSignIn = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        if (password) {
            await signIn('credentials', {
                redirect: false,
                email,
                password,
                totpCode,
                recoveryCode,
                showOTP,
                showRecoveryCode,
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
                        case ErrorCode.IncorrectTwoFactorCode:
                            setTotpCode('');
                            toast({
                                title: 'Invalid credentials',
                                status: 'error',
                            });
                            InputUtil.focus(inputRefTotpCode);
                            return;
                        case ErrorCode.IncorrectRecoveryCode:
                            setRecoveryCode('');
                            toast({
                                title: 'Invalid credentials',
                                status: 'error',
                            });
                            InputUtil.focus(inputRefRecoveryCode);
                            return;
                        case ErrorCode.SecondFactorRequest:
                            setShowEmail(false);
                            setShowPassword(false);
                            setShowOTP(true);
                            return;
                        case ErrorCode.SecondFactorRequired:
                            setShowPassword(false);
                            setShowRecoveryCode(false);
                            setShowOTP(true);
                            InputUtil.focus(inputRefTotpCode);
                            toast({
                                title: 'Two Factor Authentication Required',
                                status: 'warning',
                            });
                            return;
                        case ErrorCode.RecoveryCodeRequired:
                            setShowPassword(false);
                            setShowOTP(false);
                            setShowRecoveryCode(true);
                            InputUtil.focus(inputRefRecoveryCode);
                            toast({
                                title: 'Recovery Code Required',
                                status: 'warning',
                            });
                            return;
                    }
                })
                .catch(() => {
                    signInEvent();
                    toast({
                        title: 'Sorry something went wrong',
                        status: 'error',
                    });
                });
        } else {
            setShowEmail(false);
            setShowPassword(true);
            InputUtil.focus(inputRefPassword);
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
                                <>
                                    <Text fontSize={'1rem'} textAlign={'center'} color={'black'}>
                                        E-Mail
                                    </Text>
                                    <FormControl isRequired={true}>
                                        <InputGroup>
                                            <InputLeftAddon><AiTwotoneMail /></InputLeftAddon>
                                            <Input type={'email'} placeholder={''} name="email" value={email} onChange={(e) => setEmail(e.target.value)} ref={inputRefEmail} />
                                            <FormErrorMessage>{email === '' ? 'Email is requi#319795' : 'Invalid email'}</FormErrorMessage>
                                        </InputGroup>
                                    </FormControl>
                                </>
                            }
                            {showPassword &&
                                <>
                                    <Text fontSize={'1rem'} textAlign={'center'} color={'black'}>
                                        Password
                                    </Text>
                                    <FormControl isRequired={true} mb={2}>
                                        <InputGroup>
                                            <InputLeftAddon><TbPasswordUser /></InputLeftAddon>
                                            <Input type={'password'} placeholder="" value={password} onChange={(e) => setPassword(e.target.value)} ref={inputRefPassword} />
                                            <FormErrorMessage>Password cannot be less than 8 characters</FormErrorMessage>
                                        </InputGroup>
                                    </FormControl>
                                </>
                            }
                            {showOTP && <TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} refFocus={inputRefTotpCode} />}
                            {showRecoveryCode && <RecoveryCode value={recoveryCode} onChange={(val) => setRecoveryCode(val)} refFocus={inputRefRecoveryCode} />}
                        </VStack>

                        <Box>
                            {showPassword ?
                                <Button bgColor={'transparent'} fontSize={'0.8rem'} color={'#00000088'} fontFamily={'monospace'} transition={'0.5s'} _hover={{ bgColor: 'transparent', color: '#319795' }}>
                                    <Link href="reset-password">Forgot Password?</Link>
                                </Button>
                                : ''
                            }
                            {showOTP ?
                                <Button bgColor={'transparent'} fontSize={'0.8rem'} color={'#00000088'} fontFamily={'monospace'} transition={'0.5s'} _hover={{ bgColor: 'transparent', color: '#319795' }}>
                                    <a onClick={recoveryCodeEvent}>Use recovery code</a>
                                </Button>
                                : ''
                            }
                            {showRecoveryCode ?
                                <Button bgColor={'transparent'} fontSize={'0.8rem'} color={'#00000088'} fontFamily={'monospace'} transition={'0.5s'} _hover={{ bgColor: 'transparent', color: '#319795' }}>
                                    <a onClick={twoFactAuthEvent}>Use Two Factor Authentication</a>
                                </Button>
                                : ''
                            }
                        </Box>
                        <br />
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
                        {
                            !showEmail ?
                                <Flex justifyContent={'center'} marginTop={'10px'}>
                                    <Button
                                        type="button"
                                        borderRadius={'full'}
                                        bgColor={'transparent'}
                                        border={'2px solid #999'}
                                        color={'#999'}
                                        fontFamily={'monospace'}
                                        _hover={{
                                            bgColor: '#999',
                                            color: '#FFF',
                                            border: '2px solid #999',
                                        }}
                                        onClick={() => signInEvent()}
                                        w={'60%'}
                                    >
                                        CANCEL
                                    </Button>
                                </Flex>
                                : ''
                        }
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
                        onClick={() => signInEvent()}
                        _hover={{ bgColor: '#fff', color: '#319795' }}
                    >
                        SIGN IN
                    </Button>
                </Flex>
            )}
        </Flex>
    );
}
