# Call ringtone

`call-ring.wav` is an original synthesized ringtone for Saflal's foreground incoming-call screen. It contains two short 440/480 Hz pulses followed by silence, with fades to avoid clicks: three seconds, mono, 22,050 Hz, 16-bit PCM WAV.

Keep this asset with `app/call/voice.jsx`, which loads it through Expo Audio's static `require()`. It needs no remote download or third-party sound license. Stream's native incoming-call notification sound is configured separately.
