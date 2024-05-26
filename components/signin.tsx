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
import ReCAPTCHA from "react-google-recaptcha";
import { fetchSendActivation } from '@/app/services/fetchClient';
import OTPCode from '@/components/OTPCode';

interface SignInProps {
    isSignInMode: boolean;
    setSignInMode: Dispatch<SetStateAction<boolean>>;
}

export default function SignIn(props: SignInProps) {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [totpCode, setTotpCode] = useState('');
    const [recoveryCode, setRecoveryCode] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [step, setStep] = useState<string>('email');
    const [load, setLoad] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isDisabled, setIsDisabled] = useState<boolean>(false);
    const [activation, setActivation] = useState<boolean>(false)
    const toast = useToast();
    const router = useRouter();
    const reRef: any = useRef<ReCAPTCHA>();

    const inputRefEmail: any = useRef(null);
    const inputRefPassword: any = useRef(null);
    const inputRefTotpCode: any = useRef(null);
    const inputRefRecoveryCode: any = useRef(null);
    const inputRefOTPCode: any = useRef(null);

    if (!load) {
        InputUtil.focus(inputRefEmail);
        setLoad(true);
    }

    const recoveryCodeEvent = (event: any) => {
        event.preventDefault();
        setRecoveryCode('');
        setStep('recoveryCode');
    }

    const twoFactAuthEvent = (event: any) => {
        event.preventDefault();
        setRecoveryCode('');
        setStep('2fa');
    }

    const signInEvent = () => {
        props.setSignInMode(true);
        setEmail('');
        setPassword('');
        setTotpCode('');
        setRecoveryCode('');
        InputUtil.focus(inputRefEmail);
        setStep('email');
        setActivation(false);
    }

    const sendActivationLink = async () => {
        setIsLoading(true);
        setIsDisabled(true);
        const resp = await fetchSendActivation({ email });
        const data = await resp.json();
        if (data.success) {
            toast({
                title: 'Activation link sent',
                status: 'success',
            });
            signInEvent();
        } else {
            toast({
                title: 'Sorry something went wrong',
                description: data.message,
                status: 'error',
            });
        }
        setIsLoading(false);
        setIsDisabled(false);
    }

    const handleSignIn = async (e: React.SyntheticEvent) => {
        e.preventDefault();

        setIsLoading(true);
        setIsDisabled(true);

        const token = await reRef?.current?.executeAsync();

        if (password) {
            await signIn('credentials', {
                redirect: false,
                email,
                password,
                totpCode,
                recoveryCode,
                otpCode,
                step,
                token,
            })
                .then((response) => {
                    if (response?.ok) {
                        router.replace('/profile');
                        return;
                    }

                    setIsLoading(false);
                    setIsDisabled(false);
                    setActivation(false);

                    switch (response?.error) {
                        case ErrorCode.UserNotActive:
                            toast({
                                title: 'User is not active',
                                status: 'error',
                            });
                            setActivation(true);
                            return;
                        case ErrorCode.IsBot:
                            toast({
                                title: 'You are not human!',
                                status: 'error',
                            });
                            return;
                        case ErrorCode.IncorrectPassword:
                        case ErrorCode.CredentialsSignin:
                            toast({
                                title: 'Invalid credentials',
                                status: 'error',
                            });
                            setStep('password');
                            return;
                        case ErrorCode.IncorrectTwoFactorCode:
                            setTotpCode('');
                            toast({
                                title: 'Invalid Two Factor Code',
                                status: 'error',
                            });
                            InputUtil.focus(inputRefTotpCode);
                            return;
                        case ErrorCode.IncorrectRecoveryCode:
                            setRecoveryCode('');
                            toast({
                                title: 'Invalid Recovery Code',
                                status: 'error',
                            });
                            InputUtil.focus(inputRefRecoveryCode);
                            return;
                        case ErrorCode.SecondFactorRequest:
                            setStep('2fa');
                            return;
                        case ErrorCode.SecondFactorRequired:
                            setStep('2fa');
                            InputUtil.focus(inputRefTotpCode);
                            toast({
                                title: 'Two Factor Authentication Required',
                                status: 'warning',
                            });
                            return;
                        case ErrorCode.RecoveryCodeRequired:
                            setStep('recoveryCode');
                            InputUtil.focus(inputRefRecoveryCode);
                            toast({
                                title: 'Recovery Code Required',
                                status: 'warning',
                            });
                            return;
                        case ErrorCode.OTPRequest:
                            setStep('otp');
                            InputUtil.focus(inputRefOTPCode);
                            return;
                        case ErrorCode.OTPRequired:
                            setStep('otp');
                            InputUtil.focus(inputRefOTPCode);
                            toast({
                                title: 'OTP Code Required',
                                status: 'warning',
                            });
                            return;
                        case ErrorCode.IncorrectOTPCode:
                            setStep('otp');
                            setOtpCode('');
                            toast({
                                title: 'Invalid OTP Code',
                                status: 'error',
                            });
                            InputUtil.focus(inputRefOTPCode);
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
            InputUtil.focus(inputRefPassword);
            setStep('password');
            setIsLoading(false);
            setIsDisabled(false);
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
                            {step === 'email' &&
                                <>
                                    <Text fontSize={'1rem'} textAlign={'center'} color={'black'}>
                                        E-Mail
                                    </Text>
                                    <FormControl isRequired={true}>
                                        <InputGroup>
                                            <InputLeftAddon><AiTwotoneMail /></InputLeftAddon>
                                            <Input type={'email'} placeholder={''} name="email" value={email} onChange={(e) => setEmail(e.target.value)} ref={inputRefEmail} />
                                        </InputGroup>
                                        <FormErrorMessage>{email === '' ? 'Email is requi#319795' : 'Invalid email'}</FormErrorMessage>
                                    </FormControl>
                                </>
                            }
                            {step === 'password' &&
                                <>
                                    <Text fontSize={'1rem'} textAlign={'center'} color={'black'}>
                                        <b>{email}</b>
                                    </Text>
                                    {!activation && <>
                                        <Text fontSize={'1rem'} textAlign={'center'} color={'black'}>
                                            Password
                                        </Text>
                                        <FormControl isRequired={true} mb={2}>
                                            <InputGroup>
                                                <InputLeftAddon><TbPasswordUser /></InputLeftAddon>
                                                <Input type={'password'} placeholder="" value={password} onChange={(e) => setPassword(e.target.value)} ref={inputRefPassword} />
                                            </InputGroup>
                                            <FormErrorMessage>Password cannot be less than 8 characters</FormErrorMessage>
                                        </FormControl>
                                    </>
                                    }
                                </>
                            }
                            {step === '2fa' && <TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} refFocus={inputRefTotpCode} />}
                            {step === 'recoveryCode' && <RecoveryCode value={recoveryCode} onChange={(val) => setRecoveryCode(val)} refFocus={inputRefRecoveryCode} />}
                            {step === 'otp' && <OTPCode value={otpCode} onChange={(val) => setOtpCode(val)} refFocus={inputRefOTPCode} />}
                        </VStack>

                        <Box>
                            {step === 'password' && !activation ?
                                <Button bgColor={'transparent'} fontSize={'0.8rem'} color={'#00000088'} fontFamily={'monospace'} transition={'0.5s'} _hover={{ bgColor: 'transparent', color: '#319795' }}>
                                    <Link href="reset-password">Forgot Password?</Link>
                                </Button>
                                : ''
                            }
                            {step === '2fa' ?
                                <Button bgColor={'transparent'} fontSize={'0.8rem'} color={'#00000088'} fontFamily={'monospace'} transition={'0.5s'} _hover={{ bgColor: 'transparent', color: '#319795' }}>
                                    <a onClick={recoveryCodeEvent}>Use recovery code</a>
                                </Button>
                                : ''
                            }
                            {step === 'recoveryCode' ?
                                <Button bgColor={'transparent'} fontSize={'0.8rem'} color={'#00000088'} fontFamily={'monospace'} transition={'0.5s'} _hover={{ bgColor: 'transparent', color: '#319795' }}>
                                    <a onClick={twoFactAuthEvent}>Use Two Factor Authentication</a>
                                </Button>
                                : ''
                            }
                        </Box>
                        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ? <ReCAPTCHA sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || ''} size='invisible' ref={reRef} /> : ''}
                        <br />
                        {
                            activation ?
                                <Flex justifyContent={'center'} marginBottom={'10px'}>
                                    <Button
                                        type="button"
                                        borderRadius={'full'}
                                        bgColor={'#ff8a00'}
                                        border={'2px solid #ff8a00'}
                                        color={'#fff'}
                                        fontFamily={'monospace'}
                                        _hover={{
                                            bgColor: '#fff',
                                            color: '#ff8a00',
                                            border: '2px solid #ff8a00',
                                        }}
                                        onClick={() => sendActivationLink()}
                                        w={'70%'}
                                        isLoading={isLoading}
                                        isDisabled={isDisabled}
                                    >
                                        RESEND ACTIVATION LINK
                                    </Button>
                                </Flex>
                                : ''
                        }
                        {!activation ?
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
                                    isLoading={isLoading}
                                    isDisabled={isDisabled}
                                >
                                    SIGN IN
                                </Button>
                            </Flex>
                            : ''
                        }
                        {
                            step !== 'email' ?
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
                                        isDisabled={isDisabled}
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
