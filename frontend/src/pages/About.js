import React from 'react';

const About = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-islamic-green-500 to-islamic-green-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              About Our Project
            </h1>
            <p className="text-xl opacity-90 max-w-3xl mx-auto">
              Discover the technology and mission behind the Quran Verse Identifier
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-16">
          {/* Project Overview */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-6">
                  Our Mission
                </h2>
                <div className="space-y-4 text-gray-600 text-lg">
                  <p>
                    The Quran Verse Identifier is an innovative project that combines
                    cutting-edge audio recognition technology with the sacred text of
                    the Quran to help users identify verses from audio recordings.
                  </p>
                  <p>
                    Our goal is to make the Quran more accessible and searchable for
                    students, researchers, and anyone seeking to identify specific
                    verses they hear in recitations, lectures, or personal study.
                  </p>
                  <p>
                    This tool serves the global Muslim community by bridging the gap
                    between audio and text, making Quranic knowledge more discoverable
                    and accessible in our digital age.
                  </p>
                </div>
              </div>

              <div className="card p-8">
                <div className="text-center">
                  <div className="w-24 h-24 bg-islamic-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-4xl">🕌</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    Built for the Ummah
                  </h3>
                  <p className="text-gray-600">
                    This project is created with love and respect for the Muslim
                    community, providing a modern tool to engage with the Holy Quran
                    in new and meaningful ways.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="bg-white rounded-2xl shadow-sm p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                How Our Technology Works
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Understanding the advanced audio processing and machine learning
                behind verse identification
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎵</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Audio Fingerprinting
                </h3>
                <p className="text-gray-600">
                  We extract unique acoustic features from audio recordings using
                  MFCC (Mel-frequency cepstral coefficients), spectral characteristics,
                  and rhythm analysis.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🧠</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Machine Learning
                </h3>
                <p className="text-gray-600">
                  Advanced algorithms compare uploaded audio against our database
                  of pre-processed verse fingerprints to find the closest matches
                  with confidence scores.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  Accurate Results
                </h3>
                <p className="text-gray-600">
                  The system provides ranked results with confidence scores,
                  allowing users to identify verses even from recordings with
                  background noise or different recitation styles.
                </p>
              </div>
            </div>
          </section>

          {/* Technology Stack */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Technology Stack
              </h2>
              <p className="text-lg text-gray-600">
                Built with modern, robust technologies for optimal performance
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Backend */}
              <div className="card p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-2xl">⚙️</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Backend</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800">FastAPI Framework</h4>
                    <p className="text-gray-600 text-sm">
                      High-performance Python web framework with automatic API documentation
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">librosa Library</h4>
                    <p className="text-gray-600 text-sm">
                      Professional audio analysis and feature extraction for Python
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">SQLite Database</h4>
                    <p className="text-gray-600 text-sm">
                      Lightweight, serverless database for storing verse data and fingerprints
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Pydantic Models</h4>
                    <p className="text-gray-600 text-sm">
                      Data validation and settings management using Python type annotations
                    </p>
                  </div>
                </div>
              </div>

              {/* Frontend */}
              <div className="card p-8">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    <span className="text-2xl">🎨</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Frontend</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-800">React Framework</h4>
                    <p className="text-gray-600 text-sm">
                      Modern JavaScript library for building interactive user interfaces
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Tailwind CSS</h4>
                    <p className="text-gray-600 text-sm">
                      Utility-first CSS framework for rapidly building responsive designs
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">React Router</h4>
                    <p className="text-gray-600 text-sm">
                      Declarative routing for React applications with multiple pages
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">Axios HTTP Client</h4>
                    <p className="text-gray-600 text-sm">
                      Promise-based HTTP client for making API requests from the browser
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Sources */}
          <section className="bg-blue-50 rounded-2xl p-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Data Sources & Acknowledgments
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-2xl mr-3">🎧</span>
                  Audio Source
                </h3>
                <div className="space-y-3">
                  <p className="text-gray-600">
                    <strong>EveryAyah.com</strong> - High-quality Quran audio recitations
                    from various reciters, providing the foundation for our audio
                    fingerprint database.
                  </p>
                  <p className="text-sm text-gray-500">
                    We are grateful to EveryAyah.com for making these beautiful
                    recitations freely available for educational purposes.
                  </p>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                  <span className="text-2xl mr-3">📖</span>
                  Text Source
                </h3>
                <div className="space-y-3">
                  <p className="text-gray-600">
                    <strong>Tanzil.net</strong> - Accurate Arabic text of the Quran
                    with verified translations, ensuring the authenticity of our
                    verse identification results.
                  </p>
                  <p className="text-sm text-gray-500">
                    The Quran text is used respectfully and in accordance with
                    Islamic guidelines for digital Quran applications.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Key Features
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="card p-6 text-center">
                <div className="text-3xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  High Accuracy Recognition
                </h3>
                <p className="text-gray-600 text-sm">
                  Advanced audio fingerprinting technology ensures accurate
                  verse identification even with varying audio quality.
                </p>
              </div>

              <div className="card p-6 text-center">
                <div className="text-3xl mb-4">📱</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  User-Friendly Interface
                </h3>
                <p className="text-gray-600 text-sm">
                  Intuitive drag-and-drop upload with real-time processing
                  feedback and beautiful Arabic text rendering.
                </p>
              </div>

              <div className="card p-6 text-center">
                <div className="text-3xl mb-4">🔒</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Privacy Focused
                </h3>
                <p className="text-gray-600 text-sm">
                  Audio files are processed temporarily and securely, with no
                  permanent storage of user uploads.
                </p>
              </div>

              <div className="card p-6 text-center">
                <div className="text-3xl mb-4">⚡</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Fast Processing
                </h3>
                <p className="text-gray-600 text-sm">
                  Optimized algorithms deliver identification results typically
                  within seconds of upload completion.
                </p>
              </div>

              <div className="card p-6 text-center">
                <div className="text-3xl mb-4">🌍</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Multiple Reciters
                </h3>
                <p className="text-gray-600 text-sm">
                  Trained on various recitation styles to recognize verses
                  regardless of the reciter's unique vocal characteristics.
                </p>
              </div>

              <div className="card p-6 text-center">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Detailed Analytics
                </h3>
                <p className="text-gray-600 text-sm">
                  Confidence scores and match rankings help users understand
                  the reliability of identification results.
                </p>
              </div>
            </div>
          </section>

          {/* Contact & Feedback */}
          <section className="bg-islamic-green-50 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Feedback & Contributions
            </h2>
            <p className="text-lg text-gray-600 mb-8 max-w-3xl mx-auto">
              This is an open educational project aimed at serving the Muslim
              community. We welcome feedback, suggestions, and contributions to
              help improve the system's accuracy and user experience.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6">
                <div className="text-3xl mb-3">💡</div>
                <h3 className="font-semibold text-gray-800 mb-2">Suggestions</h3>
                <p className="text-gray-600 text-sm">
                  Share ideas for new features or improvements to make the tool
                  more useful for the community.
                </p>
              </div>

              <div className="p-6">
                <div className="text-3xl mb-3">🐛</div>
                <h3 className="font-semibold text-gray-800 mb-2">Bug Reports</h3>
                <p className="text-gray-600 text-sm">
                  Help us identify and fix issues to ensure the best possible
                  user experience for everyone.
                </p>
              </div>

              <div className="p-6">
                <div className="text-3xl mb-3">🤝</div>
                <h3 className="font-semibold text-gray-800 mb-2">Collaboration</h3>
                <p className="text-gray-600 text-sm">
                  Developers and researchers interested in contributing to this
                  Islamic technology project are always welcome.
                </p>
              </div>
            </div>

            <div className="mt-8 p-6 bg-white rounded-lg border border-islamic-green-200">
              <p className="text-sm text-gray-600">
                <strong>Disclaimer:</strong> This tool is provided for educational and
                research purposes. While we strive for accuracy, users should verify
                results when using this tool for academic or religious study.
                May Allah accept this humble effort to serve His book.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default About;