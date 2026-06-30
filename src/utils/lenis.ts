import Lenis from "lenis";

export let lenis: Lenis | null = null;

export const setLenis = (instance: Lenis) => {
    lenis = instance;
};