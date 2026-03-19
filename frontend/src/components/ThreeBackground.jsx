import React from 'react'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function ThreeBackground({ interactive = false, parallaxIntensity = 0.5 }) {
  const containerRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const rendererRef = useRef(null)
  const particlesRef = useRef(null)
  const geometriesRef = useRef([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const targetRotationRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!containerRef.current) return

    // Scene Setup
    const scene = new THREE.Scene()
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      10000
    )
    camera.position.z = 50
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setClearColor(0x000000, 1)
    renderer.shadowMap.enabled = true
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
    scene.add(ambientLight)

    const pointLight1 = new THREE.PointLight(0x00ffd1, 1, 200)
    pointLight1.position.set(50, 50, 50)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0x8b5cf6, 0.8, 150)
    pointLight2.position.set(-50, -30, 50)
    scene.add(pointLight2)

    // Create Particle System
    const particleCount = 1200
    const particleGeometry = new THREE.BufferGeometry()
    const particlePositions = new Float32Array(particleCount * 3)
    const particleSizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 200
      particlePositions[i + 1] = (Math.random() - 0.5) * 200
      particlePositions[i + 2] = (Math.random() - 0.5) * 200
      particleSizes[i / 3] = Math.random() * 0.5
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00ffd1,
      size: 0.5,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6,
    })

    const particles = new THREE.Points(particleGeometry, particleMaterial)
    scene.add(particles)
    particlesRef.current = particles

    // Create Geometric Shapes
    const shapes = []

    // Dodecahedron
    const dodecaGeometry = new THREE.DodecahedronGeometry(8, 0)
    const dodecaMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffd1,
      emissive: 0x00ffaa,
      wireframe: false,
      transparent: true,
      opacity: 0.8,
    })
    const dodecahedron = new THREE.Mesh(dodecaGeometry, dodecaMaterial)
    dodecahedron.position.set(30, 20, 0)
    dodecahedron.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    scene.add(dodecahedron)
    shapes.push({
      mesh: dodecahedron,
      rotationSpeed: { x: 0.002, y: 0.003, z: 0.001 },
      floatSpeed: 0.0003,
      floatAmplitude: 20,
    })

    // Icosahedron
    const icoGeometry = new THREE.IcosahedronGeometry(10, 0)
    const icoMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b5cf6,
      emissive: 0x7c3aed,
      wireframe: false,
      transparent: true,
      opacity: 0.7,
    })
    const icosahedron = new THREE.Mesh(icoGeometry, icoMaterial)
    icosahedron.position.set(-40, -15, 0)
    icosahedron.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    scene.add(icosahedron)
    shapes.push({
      mesh: icosahedron,
      rotationSpeed: { x: 0.001, y: 0.002, z: 0.003 },
      floatSpeed: 0.0002,
      floatAmplitude: 15,
    })

    // Torus Ring
    const torusGeometry = new THREE.TorusGeometry(15, 3, 32, 100)
    const torusMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffd1,
      emissive: 0x00ffaa,
      wireframe: false,
      transparent: true,
      opacity: 0.5,
    })
    const torus = new THREE.Mesh(torusGeometry, torusMaterial)
    torus.position.set(0, 0, -30)
    torus.rotation.set(Math.PI / 4, 0, 0)
    scene.add(torus)
    shapes.push({
      mesh: torus,
      rotationSpeed: { x: 0.001, y: 0.005, z: 0 },
      floatSpeed: 0.0001,
      floatAmplitude: 10,
    })

    // Octahedron
    const octaGeometry = new THREE.OctahedronGeometry(7, 0)
    const octaMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b5cf6,
      emissive: 0x7c3aed,
      wireframe: false,
      transparent: true,
      opacity: 0.6,
    })
    const octahedron = new THREE.Mesh(octaGeometry, octaMaterial)
    octahedron.position.set(25, -25, 20)
    octahedron.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    scene.add(octahedron)
    shapes.push({
      mesh: octahedron,
      rotationSpeed: { x: 0.003, y: 0.001, z: 0.002 },
      floatSpeed: 0.00025,
      floatAmplitude: 18,
    })

    // Tetrahedron
    const tetraGeometry = new THREE.TetrahedronGeometry(9, 0)
    const tetraMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffd1,
      emissive: 0x00ffaa,
      wireframe: false,
      transparent: true,
      opacity: 0.55,
    })
    const tetrahedron = new THREE.Mesh(tetraGeometry, tetraMaterial)
    tetrahedron.position.set(-30, 25, -15)
    tetrahedron.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
    scene.add(tetrahedron)
    shapes.push({
      mesh: tetrahedron,
      rotationSpeed: { x: 0.002, y: 0.001, z: 0.003 },
      floatSpeed: 0.0002,
      floatAmplitude: 12,
    })

    geometriesRef.current = shapes

    // Mouse Movement for Parallax
    const onMouseMove = (event) => {
      if (!interactive) return
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1
    }

    if (interactive) {
      window.addEventListener('mousemove', onMouseMove)
    }

    // Animation Loop
    let animationFrameId
    let time = 0

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      time += 0.016 // Approximate 60 FPS delta

      // Rotate particles slowly
      if (particlesRef.current) {
        particlesRef.current.rotation.x += 0.0001
        particlesRef.current.rotation.y += 0.00015
      }

      // Animate geometries
      geometriesRef.current.forEach((shape, index) => {
        const { mesh, rotationSpeed, floatSpeed, floatAmplitude } = shape

        // Rotation
        mesh.rotation.x += rotationSpeed.x
        mesh.rotation.y += rotationSpeed.y
        mesh.rotation.z += rotationSpeed.z

        // Floating motion (sine wave)
        mesh.userData.floatOffset = (mesh.userData.floatOffset || 0) + floatSpeed
        mesh.userData.originalY = mesh.userData.originalY || mesh.position.y
        mesh.position.y = mesh.userData.originalY + Math.sin(mesh.userData.floatOffset) * floatAmplitude
      })

      // Parallax effect
      if (interactive && cameraRef.current) {
        targetRotationRef.current.x += (mouseRef.current.y * parallaxIntensity - targetRotationRef.current.x) * 0.05
        targetRotationRef.current.y += (mouseRef.current.x * parallaxIntensity - targetRotationRef.current.y) * 0.05

        cameraRef.current.rotation.order = 'YXZ'
        cameraRef.current.rotation.y = targetRotationRef.current.y
        cameraRef.current.rotation.x = targetRotationRef.current.x
      }

      renderer.render(scene, camera)
    }

    animate()

    // Handle Window Resize
    const onWindowResize = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth
      const height = containerRef.current?.clientHeight || window.innerHeight

      cameraRef.current.aspect = width / height
      cameraRef.current.updateProjectionMatrix()
      renderer.setSize(width, height)
    }

    window.addEventListener('resize', onWindowResize)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onWindowResize)
      cancelAnimationFrame(animationFrameId)
      containerRef.current?.removeChild(renderer.domElement)
      renderer.dispose()
    }
  }, [interactive, parallaxIntensity])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      }}
    />
  )
}

export default ThreeBackground
