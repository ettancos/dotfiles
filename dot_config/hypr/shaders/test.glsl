// Battery Low Alert Shader

precision mediump float;
varying vec2 v_texcoord;
uniform sampler2D tex;

const float dimmingFactor = 0.5; // Adjust this value to control the dimming intensity
const float redIntensity = 1.5;  // Adjust this value to control the red intensity

void main() {
    vec4 pixColor = texture2D(tex, v_texcoord);
    pixColor.rgb *= dimmingFactor;
    float gray = dot(pixColor.rgb, vec3(0.299, 0.587, 0.114));
    gl_FragColor = mix(pixColor, vec4(gray, 0.0, 0.0, 1.0), redIntensity);
    gl_FragColor.a = pixColor.a;
}
