import { Modal, ModalOverlay, Flex, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, FormControl, FormLabel, Switch, useDisclosure, Text, Input, useToast, InputGroup, InputLeftAddon, Box } from '@chakra-ui/react';
import { useState } from 'react';
import { ErrorCode } from '@/utils/ErrorCode';
import TwoFactAuth from '@/components/TwoFactAuth';
import { IUser } from '@/models/User';
import { fetchTwoFactorDisable, fetchTwoFactorEnable, fetchTwoFactorSetup } from '@/app/services/fetchClient';
import { LockIcon } from '@chakra-ui/icons';
import Image from 'next/image'

enum SetupStep {
    ConfirmPassword,
    DisplayQrCode,
    EnterTotpCode,
}

const WithStep = ({ step, current, children }: { step: SetupStep; current: SetupStep; children: JSX.Element }) => {
    return step === current ? children : null;
};

const TwoFactSetupModal = ({ isOpen, onClose, onEnable }: { isOpen: boolean; onClose: () => void; onEnable: () => void }) => {
    const [dataUri, setDataUri] = useState('');
    const [password, setPassword] = useState('');
    const [totpCode, setTotpCode] = useState('');
    const toast = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(SetupStep.ConfirmPassword);

    function close() {
        onClose();
        setPassword('');
        setStep(SetupStep.ConfirmPassword);
    }

    async function handleSetup() {
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetchTwoFactorSetup(password);
            const body = response.body;

            if (response.status === 200) {
                setDataUri(body.dataUri);
                setStep(SetupStep.DisplayQrCode);
                return;
            }

            if (body.error === ErrorCode.IncorrectPassword) {
                toast({
                    title: 'Incorrect Password',
                    status: 'error',
                });
            } else if (body.error) {
                toast({
                    title: 'Sorry something went wrong',
                    status: 'error',
                });
            }
        } catch (e) {
            toast({
                title: 'Sorry something went wrong',
                status: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleEnable(totpCode: string) {
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            const body = await fetchTwoFactorEnable(totpCode);
            if (body.error === ErrorCode.IncorrectTwoFactorCode) {
                toast({
                    title: 'Incorrect code. Please try again',
                    status: 'error',
                });
            } else if (body.error) {
                toast({
                    title: 'Sorry something went wrong',
                    status: 'error',
                });
            } else {
                toast({
                    title: 'Successfully enabled 2FA',
                    status: 'success',
                });
            }

            onEnable();
        } catch (e) {
            toast({
                title: 'Sorry something went wrong',
                status: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={close}>
            <ModalOverlay />
            <ModalContent>
                <WithStep step={SetupStep.ConfirmPassword} current={step}>
                    <>
                        <ModalHeader>Enable two-factor authentication</ModalHeader>
                        <ModalBody>
                            <Input type={'password'} placeholder="*******" size="md" value={password} onChange={(event: any) => setPassword(event.target.value)} />
                        </ModalBody>
                        <ModalFooter>
                            <Button mr={3} onClick={close}>
                                Close
                            </Button>
                            <Button colorScheme={'teal'} onClick={handleSetup}>
                                Continue
                            </Button>
                        </ModalFooter>
                    </>
                </WithStep>
                <WithStep step={SetupStep.DisplayQrCode} current={step}>
                    <>
                        <ModalHeader>Enable two-factor authentication</ModalHeader>
                        <ModalBody>
                            <Text marginBottom={'2em'}>Scan the image below with the authenticator app on your phone or manually enter the text code instead.</Text>
                            <Image src={dataUri} width={228} height={228} style={{ margin: '0 auto' }} alt='' />
                        </ModalBody>
                        <ModalFooter>
                            <Button mr={3} onClick={close}>
                                Close
                            </Button>
                            <Button colorScheme={'teal'} onClick={() => setStep(SetupStep.EnterTotpCode)}>
                                Continue
                            </Button>
                        </ModalFooter>
                    </>
                </WithStep>
                <WithStep step={SetupStep.EnterTotpCode} current={step}>
                    <>
                        <ModalHeader>Enable two-factor authentication</ModalHeader>
                        <ModalBody>
                            <Text mb={2}>Enter your code to enable 2FA</Text>
                            <TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} refFocus='' />
                        </ModalBody>
                        <ModalFooter>
                            <Button mr={3} onClick={close}>
                                Close
                            </Button>
                            <Button colorScheme={'teal'} onClick={() => handleEnable(totpCode)}>
                                Enable
                            </Button>
                        </ModalFooter>
                    </>
                </WithStep>
            </ModalContent>
        </Modal>
    );
};

const DisableTwoFactSetupModal = ({ isOpen, onClose, onDisable }: { isOpen: boolean; onClose: () => void; onDisable: () => void }) => {
    const [totpCode, setTotpCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const toast = useToast();

    async function handleDisable() {
        if (isSubmitting) {
            return;
        }

        setIsSubmitting(true);

        try {
            const body = await fetchTwoFactorDisable(totpCode);

            if (body.error === ErrorCode.IncorrectTwoFactorCode) {
                toast({
                    title: 'Incorrect code. Please try again',
                    status: 'error',
                });
            } else if (body.error === ErrorCode.SecondFactorRequired) {
                toast({
                    title: 'Code is empty. Please try again',
                    status: 'error',
                });
            } else if (body.error || body.message === 'Not authenticated') {
                toast({
                    title: 'Sorry something went wrong',
                    status: 'error',
                });
            } else {
                toast({
                    title: 'Successfully disabled 2FA',
                    status: 'success',
                });
                onDisable();
            }
        } catch (e) {
            toast({
                title: 'Sorry something went wrong',
                status: 'error',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Disable two-factor authentication</ModalHeader>
                <ModalBody>
                    <Text mb={2}>Enter your code to disable 2FA</Text>
                    <TwoFactAuth value={totpCode} onChange={(val) => setTotpCode(val)} refFocus='' />
                </ModalBody>
                <ModalFooter>
                    <Button mr={3} onClick={onClose}>
                        Close
                    </Button>
                    <Button colorScheme={'teal'} onClick={handleDisable}>
                        Disable
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};

export default function TwoFactSettings({ user }: { user: IUser }) {
    const { isOpen: isOpenSetupModal, onOpen: onOpenSetupModal, onClose: onCloseSetupModal } = useDisclosure();
    const { isOpen: isOpenDisableModal, onOpen: onOpenDisableModal, onClose: onCloseDisableModal } = useDisclosure();
    const [isEnabled, setEnabled] = useState(user?.twoFactorEnabled);
    const [recoveryCode, setRecoveryCode] = useState(user?.recoveryCode);

    function handleOnEnable() {
        setEnabled(true);
        onCloseSetupModal();
    }

    function handleOnDisable() {
        setEnabled(false);
        onCloseDisableModal();
    }

    return (
        <>
            <Flex justifyContent={'center'} marginTop="2em">
                <FormControl display="flex" alignItems="center" justifyContent="center">
                    <FormLabel htmlFor="email-alerts" mb="0">
                        Two factor authentication
                    </FormLabel>
                    <Switch colorScheme="teal" id="email-alerts" isChecked={isEnabled} onChange={isEnabled ? onOpenDisableModal : onOpenSetupModal} />

                </FormControl>
                <TwoFactSetupModal isOpen={isOpenSetupModal} onClose={onCloseSetupModal} onEnable={handleOnEnable} />
                <DisableTwoFactSetupModal isOpen={isOpenDisableModal} onClose={onCloseDisableModal} onDisable={handleOnDisable} />
            </Flex>
            <Flex justifyContent={'center'} marginTop="2em">
                {isEnabled ?
                    <Box display="flex" alignItems="center" justifyContent="center">
                        <InputGroup>
                            <InputLeftAddon><LockIcon />&nbsp;2FA Recovery Code</InputLeftAddon>
                            <Input type={'text'} placeholder={''} name="recoveryCode" value={recoveryCode} readOnly />
                        </InputGroup>
                    </Box> : ''}
            </Flex>
        </>
    );
}
