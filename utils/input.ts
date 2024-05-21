export const focus = (inputRef: any) => {
    const check = setInterval(() => {
        try {
            inputRef.current.focus();
            clearInterval(check);
        } catch (e) { }
    }, 5);
}

export default {
    focus,
}