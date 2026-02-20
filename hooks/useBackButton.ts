import { useEffect, useRef, useCallback } from 'react';
import { App } from '@capacitor/app';

interface UseBackButtonProps {
    isThemeSelectorOpen: boolean;
    history: string[];
    navigateBack: () => void;
    setIsThemeSelectorOpen: (isOpen: boolean) => void;
    setShowExitConfirm: (show: boolean) => void;
}

export function useBackButton({
    isThemeSelectorOpen,
    history,
    navigateBack,
    setIsThemeSelectorOpen,
    setShowExitConfirm,
}: UseBackButtonProps) {
    const historyRef = useRef(history);
    useEffect(() => {
        historyRef.current = history;
    }, [history]);

    const isThemeSelectorOpenRef = useRef(isThemeSelectorOpen);
    useEffect(() => {
        isThemeSelectorOpenRef.current = isThemeSelectorOpen;
    }, [isThemeSelectorOpen]);

    const handleBackButton = useCallback(() => {
        if (isThemeSelectorOpenRef.current) {
            setIsThemeSelectorOpen(false);
            return;
        }

        if (historyRef.current.length > 1) {
            navigateBack();
        } else {
            setShowExitConfirm(true);
        }
    }, [navigateBack, setIsThemeSelectorOpen, setShowExitConfirm]);

    useEffect(() => {
        const listener = App.addListener('backButton', () => {
            handleBackButton();
        });

        // Also keep the document listener for broader compatibility
        document.addEventListener('backbutton', handleBackButton, false);

        return () => {
            listener.then(l => l.remove());
            document.removeEventListener('backbutton', handleBackButton, false);
        };
    }, [handleBackButton]);
}
