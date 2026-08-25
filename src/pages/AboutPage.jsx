const AboutPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-2xl w-full border border-gray-100">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-2">SIRTU</h1>
          <p className="text-lg md:text-xl text-gray-600 mb-2">Sistem Informasi Rukun Tetangga Ku</p>
          <p className="text-sm text-gray-500 font-medium">ver. 25.0.1</p>
        </div>

        {/* Description Section */}
        <div className="text-center mb-8 space-y-4">
          <p className="text-gray-700 leading-relaxed">
            Dibangun dan didedikasikan untuk masyarakat RT 05 RW 08
            <br />
            Kelurahan Padangsari - Banyumanik Semarang
          </p>
          <p className="text-gray-600 italic text-lg font-medium">
            "Semoga mempermudah dan menjadi ladang amalan ibadah"
          </p>
        </div>

        {/* Team Section */}
        <div className="space-y-6 mb-8">
          {/* Design & Analysis */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Desain & Analisa</h3>
            <p className="text-gray-700 font-medium">Wawan Gunawan Utama</p>
            <p className="text-sm text-gray-600">Pak RT Periode 2025 - 2030</p>
          </div>

          {/* Programmer */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">Programer</h3>
            <p className="text-gray-700 font-medium">Muhamad Nur Ridwan</p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pt-6 border-t border-gray-200">
          <p className="text-gray-600 font-semibold tracking-wide">Tercipta - Amanah - Transparan</p>
        </div>
      </div>
    </div>
  )
}

export default AboutPage
