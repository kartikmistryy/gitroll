export const Footer = () => {
    return(
        <footer className="w-full bg-black h-full ">
            <div className="w-full h-full text-white flex md:flex-row flex-col items-start py-14 md:px-10 px-5 justify-start max-w-[1400px] mx-auto">
            <div className="w-full h-full flex flex-col justify-between items-start md:basis-3/5 basis-full md:min-h-[200px] min-h-[80px]">
                <span className="w-full h-full flex flex-row md:items-center items-center justify-start">
                    <h3 className="md:text-4xl text-xl font-black font-serif bg-white p-2 rounded-full md:h-16 h-10 md:w-16 w-10 flex items-center justify-center text-black logo">G</h3>
                    <h4 className="md:text-5xl text-xl font-mono font-black ml-2">omnis.farm</h4>
                </span>
                <span className="w-full mt-auto md:flex hidden lg:m-0">
                    <ul className="flex flex-row w-full justify-start items-end gap-6">
                        <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</a></li>
                    </ul>
                </span>
            </div>
            <div className="w-full h-full md:basis-1/5 basis-full ">
                <h3 className="md:text-2xl text-xl font-bold">Quick Links</h3>
                <ul className="flex flex-col w-full h-fit justify-start items-start md:text-xl text-lg gap-2 mt-5">
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">About Us</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">How It Works</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact</a></li>
                </ul>
            </div>
            <div className="w-full h-full md:basis-1/5 basis-full md:mt-0 mt-10">
                <h3 className="md:text-2xl text-xl font-bold">Connect</h3>
                <ul className="flex flex-col w-full h-fit justify-start items-start md:text-xl text-lg gap-2 mt-5">
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Email</a></li>  
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Linkedin</a></li>
                    <li><a href="#" className="text-gray-400 hover:text-white transition-colors">X/Twitter</a></li>
                </ul>
            </div>
            <span className="w-full md:hidden flex md:mt-0 mt-10">
                    <ul className="flex flex-row w-full justify-start items-end gap-6">
                        <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                        <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms & Conditions</a></li>
                    </ul>
            </span>
            </div>
        </footer>
    )
}