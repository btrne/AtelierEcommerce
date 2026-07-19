export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="top-0 left-0 w-full z-50 h-[100px] flex items-center bg-surface/80 backdrop-blur-sm px-margin-mobile md:px-margin-desktop">
        <div className="max-w-container-max mx-auto w-full flex justify-between items-center">
          <a className="font-headline-md text-headline-md font-normal tracking-widest text-primary uppercase" href="/">Atelier</a>
          <a className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors duration-300" href="/">Quay lại</a>
        </div>
      </header>
      <div className="fixed inset-0 -z-10 overflow-hidden opacity-10">
        <img
          alt=""
          className="w-full h-full object-cover grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDc5LYNm24VbdkskEfZZpv7OsFbWdxmcMegME_SWqK0M6sld4V2lnvXxoMaZw_le8ApKvpmV8rHnjfY0eVDPSOvCOMYanFHMmm3DF1Sp3rMmK07dF5GWv3noQxam8MLZQ3rTYW4dSQrNDffDcpUj7OebwHcWGxpouu-GAMVlEPCz2O-slEXC9U6Er-pfxClYvXqqiocgZfS5hlVjhPz7fZZ4JG6atUSXTzwDuMAeQbzKr4bB14UEUOJgSW_bJisDPJ1s8ScJfdj6U09"
        />
      </div>
      <div className="min-h-[calc(100vh-100px)] flex flex-col justify-center items-center pt-[100px] pb-[100px]">
        {children}
      </div>
    </>
  );
}
