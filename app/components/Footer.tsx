// export const Footer = () => {
//     return (
//         <footer className="w-full bg-black text-white">
//             <div className="max-w-2xl mx-auto px-4 py-12">
//                 <div className="flex flex-col lg:flex-row justify-between items-start gap-8">
//                     {/* Left side - Logo and Newsletter */}
//                     <div className="flex flex-col gap-6">
//                         {/* Logo */}
//                         <div className="flex items-center space-x-2">
//                         <h3 className="md:text-sm text-xs font-black font-serif bg-white p-2 rounded-full h-6 w-6 flex items-center text-black justify-center">G</h3>
//                         <h4 className="md:text-base text-xs font-mono  font-black ml-2 ">GitRoll</h4>
//                         </div>
                        
//                         {/* Newsletter */}
//                         <div className="flex flex-col gap-2">
//                             <h3 className="text-sm font-medium text-gray-300">Stay updated</h3>
//                             <div className="flex gap-2">
//                                 <input 
//                                     type="email" 
//                                     placeholder="Enter your email" 
//                                     className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
//                                 />
//                                 <button className="px-6 py-2 bg-white text-black font-semibold rounded-md hover:bg-gray-200 transition-colors duration-200">
//                                     Subscribe
//                                 </button>
//                             </div>
//                         </div>
//                     </div>

//                     {/* Right side - Quick Links */}
//                     <div className="flex flex-col gap-4">
//                         <h3 className="text-sm font-medium text-gray-300">Quick Links</h3>
//                         <div className="flex flex-col gap-2">
//                             <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">About Us</a>
//                             <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">How It Works</a>
//                             <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Pricing</a>
//                             <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Contact</a>
//                             <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">Privacy Policy</a>
//                         </div>
//                     </div>
//                 </div>

//                 {/* Bottom section - HR and Copyright */}
//                 <hr className="border-gray-800 my-8" />
//                 <div className="text-center text-gray-400 text-sm">
//                     © 2024 BusinessConnector. All rights reserved.
//                 </div>
//             </div>
//         </footer>
//     )
// }

export const Footer = () => {
    return(
        <footer className="w-full bg-black h-full ">
            <div className="w-full h-full text-white flex md:flex-row flex-col items-start py-14 md:px-10 px-5 justify-start max-w-[1400px] mx-auto">
            <div className="w-full h-full flex flex-col justify-between items-start md:basis-3/5 basis-full md:min-h-[200px] min-h-[80px]">
                <span className="w-full h-full flex flex-row md:items-center items-center justify-start">
                    <h3 className="md:text-4xl text-xl font-black font-serif bg-white p-2 rounded-full md:h-16 h-10 md:w-16 w-10 flex items-center justify-center text-black logo">G</h3>
                    <h4 className="md:text-5xl text-xl font-mono font-black ml-2">GitRoll</h4>
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