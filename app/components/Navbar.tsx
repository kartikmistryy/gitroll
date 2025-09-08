import Link from "next/link"

export const Navbar = () => {
    return (
        <nav className="w-full h-14 lg:max-w-xl max-w-[95%] bg-[#edededb8] backdrop-blur-md fixed top-6 md:pl-5 md:pr-2 px-3 md:left-[50%] left-1/2 translate-x-[-50%] rounded-full flex flex-row justify-center items-center z-[999]">
            <span className="w-full h-full flex flex-row items-center justify-start">
                <h3 className="text-base font-black font-serif bg-white p-2 rounded-full h-6 w-6 flex items-center justify-center logo">G</h3>
                <h4 className="text-base font-mono  font-black ml-2">GitRoll</h4>
            </span>

            <span className="w-full h-full flex flex-row items-center justify-end md:gap-5 gap-2 md:text-base text-sm font-medium">
                <Link href="/">How it works</Link>
                {/* <Link href="/about">About</Link> */}
                <Link className="bg-[#181818] px-4 py-1.5 text-white rounded-3xl md:text-base text-sm transition-all duration-300 hover:bg-[#2e2e2e] hover:text-[#fff]" href="/dashboard">Login</Link>
            </span>
        </nav>
    )
}