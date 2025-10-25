import React, { useEffect, useRef } from 'react';

/**
 * PizzaShader - Animated rotating pizza shader
 * Converted from ShaderToy format to WebGL React component
 */
export const PizzaShader = ({ className = '' }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      console.warn('WebGL not supported');
      return;
    }

    // Vertex shader (simple passthrough)
    const vertexShaderSource = `
      attribute vec2 position;
      void main() {
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment shader (converted from ShaderToy)
    const fragmentShaderSource = `
      precision mediump float;
      uniform vec2 iResolution;
      uniform float iTime;

      float hash11(float p){ p = fract(p*0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
      vec2  hash21(float p){ float h = hash11(p); return vec2(h, hash11(p+7.123)); }
      float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
      float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); float a=hash12(i), b=hash12(i+vec2(1,0)), c=hash12(i+vec2(0,1)), d=hash12(i+vec2(1,1)); vec2 u=f*f*(3.0-2.0*f); return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);}
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){s+=a*vnoise(p); p*=2.02; a*=.55;} return s;}
      mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c);}
      float sdCircle(vec2 p,float r){return length(p)-r;}
      float aastep(float e,float x){float w=fwidth(x)*.7;return smoothstep(e-w,e+w,x);}

      void main(){
          vec2 fragCoord = gl_FragCoord.xy;
          vec2 R=iResolution.xy;
          vec2 uv=(fragCoord-.5*R)/R.y;

          // --- camera tilt (45° look) ---
          float t=iTime;
          float spin=t*0.4;
          mat2 rotm=rot(spin);
          vec2 p=uv;
          p*=rotm;
          p.y*=0.55; // perspective flatten for 45° tilt

          // background (wood)
          vec3 bg=mix(vec3(.17,.11,.08),vec3(.25,.18,.12),fbm(uv*5.));
          bg*=0.9+0.1*sin(uv.x*20.);

          float rPizza=0.58,rCheese=0.5,rCrustO=0.58,crustW=0.06;
          float dPizza=sdCircle(p,rPizza);
          float inPizza=1.-aastep(0.,dPizza);
          float dCheese=sdCircle(p,rCheese);
          float inCheese=1.-aastep(0.,dCheese);

          // base cheese/sauce
          vec2 tex=p*5.5;
          float cheese=fbm(tex*0.8+1.7);
          float sauce=fbm(tex*1.4-2.3);
          float sMix=smoothstep(0.55,0.8,sauce)*.55;
          vec3 cheeseCol=mix(vec3(1.0,.92,.45),vec3(.9,.78,.33),cheese);
          vec3 sauceCol=vec3(.7,.1,.08);
          vec3 base=mix(cheeseCol,sauceCol,sMix)*inCheese;

          // crust ring
          float ang=atan(p.y,p.x);
          float crustBump=(fbm(vec2(ang*2.5,0.0))+0.2)*.01;
          float dCrust=abs(length(p)-(rCheese+rCrustO)*.5+crustBump)-(crustW*.5);
          float inCrust=1.-aastep(0.,dCrust);
          if(inCrust>0.){
              float bake=fbm(vec2(ang*3.5,8.)+p*12.);
              vec3 c1=vec3(.8,.65,.4),c2=vec3(.55,.35,.18);
              base=mix(base,mix(c1,c2,smoothstep(.55,.95,bake)),inCrust);
          }

          vec3 col=mix(bg,base,inPizza);

          // --- evenly spaced pepperoni (no overlap) ---
          int ringCount=3;
          for(int r=0;r<3;r++){
              int n;
              float ringRad;
              if(r==0){ n=5; ringRad=0.2; }
              else if(r==1){ n=8; ringRad=0.33; }
              else { n=10; ringRad=0.44; }
              
              for(int i=0;i<10;i++){
                  if((r==0 && i>=5) || (r==1 && i>=8)) break;
                  float a=(float(i)/float(n))*6.2831 + 0.4*float(r);
                  vec2 c=vec2(cos(a),sin(a))*ringRad;
                  float rp=0.05;
                  float d=length(p-c)-rp;
                  float inside=1.-aastep(0.,d);
                  if(inside>0.){
                      float fat=fbm((p-c)*18.+float(i+r)*3.1);
                      vec3 pb=mix(vec3(.78,.2,.12),vec3(.64,.12,.08),0.5+0.5*fat);
                      col=mix(col,pb,inside);
                  }
              }
          }

          // --- slice lines ---
          for(int s=0;s<8;s++){
              float a=float(s)*3.14159/4.;
              vec2 dir=vec2(cos(a),sin(a));
              float dLine=abs(dot(p,dir));
              float mask=smoothstep(0.005,0.0,dLine)*(1.-smoothstep(rCheese,rPizza,length(p)));
              col=mix(col,vec3(0.0),mask*0.25);
          }

          // steam (screen-space vertical)
          float steam=fbm(vec2(uv.x*2.,uv.y*1.2+t*0.5));
          steam=smoothstep(0.62,0.78,steam);
          float nearPizza=1.-smoothstep(rPizza+0.02,rPizza+0.25,length(p));
          float above=smoothstep(-0.1,0.2,uv.y);
          float sm=steam*nearPizza*above;
          col=mix(col,vec3(1.0),sm*0.1);

          // vignette
          float vig=smoothstep(1.1,0.35,length(uv));
          col*=mix(0.85,1.0,vig);
          col=pow(col,vec3(0.4545));
          gl_FragColor=vec4(col,1.);
      }
    `;

    // Compile shader
    function compileShader(gl, source, type) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    // Create program
    const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) {
      console.error('Failed to compile shaders');
      return;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Set up geometry (full-screen quad)
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution');
    const iTimeLocation = gl.getUniformLocation(program, 'iTime');

    // Handle resize
    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Limit to 2x for performance
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    resize();
    window.addEventListener('resize', resize);

    // Animation loop
    function render() {
      const currentTime = (Date.now() - startTimeRef.current) / 1000;
      
      gl.uniform2f(iResolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(iTimeLocation, currentTime);
      
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      
      animationRef.current = requestAnimationFrame(render);
    }

    render();

    // Cleanup
    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      gl.deleteProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  );
};
