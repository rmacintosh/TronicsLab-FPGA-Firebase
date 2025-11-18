import { subcat2_fsm, subcat_vhdl } from './categories';

export const articlesToSeed = [
    { 
        slug: 'fpga-basics-a-beginners-guide', 
        title: "FPGA Basics: A Beginner's Guide", 
        description: 'Learn the fundamentals of FPGAs.', 
        category: subcat2_fsm.name, 
        imageFileName: 'fpga-basics.png', 
        imageFolderName: 'placeholder-images', 
        imageHint: 'A close-up of a complex FPGA chip.', 
        content: '<p>Field-Programmable Gate Arrays (FPGAs) are fascinating integrated circuits...</p>' 
    },
    { 
        slug: 'your-first-verilog-project-hello-world', 
        title: "Your First Verilog Project: Hello, World!", 
        description: 'A step-by-step tutorial for your first Verilog project.', 
        category: subcat2_fsm.name, 
        imageFileName: 'verilog-hello-world.png', 
        imageFolderName: 'placeholder-images', 
        imageHint: 'A computer screen with Verilog code.', 
        content: '<p>Let\'s get started with your first Verilog project...</p>' 
    },
    { 
        slug: 'advanced-fsm-design-for-complex-protocols', 
        title: "Advanced FSM Design for Complex Protocols", 
        description: 'Dive deep into finite state machine design.', 
        category: subcat2_fsm.name, 
        imageFileName: 'advanced-fsm.png', 
        imageFolderName: 'placeholder-images', 
        imageHint: 'An abstract diagram of a finite state machine.', 
        content: '<p>Finite State Machines (FSMs) are a cornerstone of digital design...</p>' 
    },
    { 
        slug: 'how-to-install-icestorm-with-docker', 
        title: 'How to install Icestorm with Docker', 
        description: 'How to install Icestorm with Docker', 
        category: subcat_vhdl.name, 
        imageFileName: 'image.jpg', 
        imageFolderName: 'images', 
        imageHint: 'placeholder ', 
        content: '<p>Today’s post is a short one...</p><h2>Icestorm Dockerfile</h2><pre><code class="language-dockerfile">...</code></pre>' 
    },
    { 
        slug: 'how-to-install-nextpnr-with-docker', 
        title: 'How to install NextPnR with Docker', 
        description: 'How to install NextPnR with Docker', 
        category: subcat_vhdl.name, 
        imageFileName: 'image.jpg', 
        imageFolderName: 'images', 
        imageHint: 'placeholder ', 
        content: '<p>Today’s post is part of a larger series that shows how to install Yosys and Icestorm with Docker...</p><h2>NextPnR Dockerfile</h2><pre><code class=\"language-dockerfile\">FROM icestorm:latest\\nRUN git clone https://github.com/YosysHQ/nextpnr nextpnr\\nRUN cd nextpnr; \\n git submodule init && git submodule update; \\n cmake . -DARCH=ice40 -DCMAKE_INSTALL_PREFIX=/usr/local; \\n make -j$(nproc); \\n make install</code></pre><p>Build the image:</p><pre><code class=\"language-undefined\">docker build -t nextpnr .</code></pre>',
    },
    {
        slug: 'how-to-install-yosys-with-docker',
        title: 'How to install Yosys with Docker',
        description: 'How to install Yosys with Docker',
        category: subcat_vhdl.name,
        imageFileName: 'image.jpg', imageFolderName: 'images',
        imageHint: 'placeholder ',
        date: '2025-10-30T06:04:29.274Z',
        views: 0,
        content: '<p>To get started with learning FPGA easily, it’s best to begin with Free and Open Source Software (FOSS). The first tool you’ll need is a Synthesizer...</p><h2>I. What is Docker? What are the benefits?</h2><p>Docker is an open-source platform for automating deployment, scaling, and management of applications as containers...</p><h2>II. Installing Yosys in Docker</h2><p>Follow the instructions here to install Docker first.</p><h3>a. The Dockerfile</h3><pre><code class=\"language-dockerfile\">FROM ubuntu:20.04\\nARG DEBIAN_FRONTEND=noninteractive\\nENV TZ=Europe/Paris\\nRUN apt-get update; apt-get -y install curl\\nRUN apt-get install -y build-essential git clang bison flex \\\\ libreadline-dev gawk tcl-dev libffi-dev git \\\\ graphviz xdot pkg-config python3 libboost-system-dev \\\\ libboost-python-dev libboost-filesystem-dev zlib1g-dev\\nRUN git clone https://github.com/YosysHQ/yosys.git yosys\\nRUN cd yosys; make -j$(nproc); make install\\nWORKDIR \"/project/\"\\nENTRYPOINT [ \"/bin/bash\", \"-c\", \"yosys src/synth/synth.ys > build/logs/syn_log.txt\" ]</code></pre><h3>b. Building the image</h3><pre><code class=\"language-undefined\">docker build -t yosys .</code></pre><h2>III. Project Workspace</h2><pre><code class=\"language-makefile\">Makefile src: synth: - synth.ys hdl: - top.v build: logs: artifacts: syn: pnr: bitstream:</code></pre><pre><code class=\"language-verilog\">// top.v\\nmodule top( input clock, input resetn, output reg LED );\\n reg tmp = 1\'b0;\\n always @(posedge clock) begin\\n if(!resetn) tmp <= 1\'b0;\\n else tmp <= ~tmp;\\n LED <= tmp;\\n end\\nendmodule</code></pre><p>Use the Makefile or Docker run commands as described...</p>',
    },
    {
        slug: 'from-hdl-to-fpga-bitstream-with-open-source-toolchain',
        title: 'From HDL to FPGA Bitstream with Open Source Toolchain',
        description: 'In almost every software domain, you can start for free with open-source tools at home. It is finally the case of FPGA, and it is time to democratize it.',
        category: subcat_vhdl.name,
        imageFileName: 'image.jpg', imageFolderName: 'images',
        imageHint: 'placeholder image for now',
        date: '2025-10-30T06:00:29.299Z',
        views: 0,
        content: '<p>Starting to learn FPGA can be challenging, and one of the biggest obstacles is the toolchain. For instance, a beginner may end up subscribing to a vendor’s website, surrendering his personal information, downloading a massive ~100GB software package, and spending half a day installing it, only to discover that he needs a license to use the IP he wanted for his project. This can be frustrating, not to mention the lack of innovation in the FPGA job, which makes our job more laborious, particularly for software engineers accustomed to more comfortable workflows.</p><p>It is ironic that licensed tools offer extensive capabilities but have two major drawbacks: they are too expensive to train people, and no one can learn at home. So we end up with a labor market withoutenough FPGA engineers. In contrast, in almost every software domain, you can start for free with open-source tools at home. It is finally the case of FPGA, and it is time to democratize it.</p><h2>Go-to toolchain for beginner</h2><p>That’s why today’s tutorial is a step-by-step guide on how to go from an HDL file to a bitstream for an ICE40 FPGA using open source tool-chain: Yosys for synthesis, Nextpnr for place and route, and Icestorm for bitstream generation and flashing.</p><p>The tutorial uses the Alchitry CU board, which integrates an ICE40 FPGA. If you’d like to follow along, you’ll need an ICE40 FPGA board like the Alchitry CU, Icebreaker, or Go Board.</p><p>🎓 Enroll in “Basic Digital Design for FPGA” Course 🚀</p><p>Or</p><p>Try it for free 🤓</p><h2>I. The tool-chain</h2><p>In my last three blog articles, we discussed how to use Docker to install Yosys, Nextpnr, and Icestorm. To move forward, it is necessary to have all three software up and running within a container. To do this tutorial, you will need to complete the following steps:</p><ul><li><p>Install Make.</p></li><li><p>Get Docker.</p></li><li><p>Follow the instructions in the article “How to install Yosys with Docker?” to obtain a functional Yosys image.</p></li><li><p>Follow the instructions in the article “How to install Icestorm with Docker?” to obtain a functional Icestorm image.</p></li><li><p>Follow the instructions in the article “How to install NextPnR with Docker?” to obtain a functional Nextpnr image.</p></li></ul><p>You will find a dockerfile for each one. Assuming you have successfully completed the installation process for all three software, you should have the following docker images: <code>yosys:latest</code>, <code>nextpnr:latest</code>, and <code>icestorm:latest</code>. You can confirm this by typing the command:</p><pre><code class=\"language-undefined\">docker images</code></pre><p>The project is available on my <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" href=\"#\">GitHub</a>.</p><h2>Project Tree</h2><pre><code class=\"language-makefile\">Makefile src: hdl: - top.v synth: - synth.ys pnr: - pnr.sh bitgen: - bitgen.sh load: - load.sh constraints: - alchitry.pcf build: artifacts: syn: pnr: bitstream: logs:</code></pre><p>If you want to do everything from scratch create a makefile and start with this. If you clone the repo just do the make command that follows.</p><pre><code class=\"language-makefile\">clean: rm -rf build/\\nbuild_tree: mkdir build\\nmkdir build/artifacts\\nmkdir build/artifacts/syn/\\nmkdir build/artifacts/pnr/\\nmkdir build/artifacts/bitstream/\\nmkdir build/logs/</code></pre><p>And run:</p><pre><code class=\"language-undefined\">make build_tree</code></pre><h2>Top module example</h2><p>The top is an LED connected to a DFF with constant 1 as d input. It is turned off when pushing the reset button. It can be any working design as long as it is written in Verilog and called <code>top.v</code>.</p><pre><code class=\"language-verilog\">module top( input clock, input resetn, output reg LED );\\n always @(posedge clock) begin\\n if(!resetn) LED <= 1\\\'b0;\\n else LED <= 1\\\'b1;\\n end\\nendmodule</code></pre><h2>II. The synthesis with Yosys</h2><p>...</p><p></p><p>This tutorial is quite extensive and may introduce several new concepts for beginners. If you feel lost or need assistance, please do not hesitate to comment. I will do my best to assist you.</p>',
    },
];