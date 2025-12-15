/***********************
 * LOGIC GATES
 ***********************/
function NOT(a) { return a ? 0 : 1 }
function AND(a, b) { return a & b }
function OR(a, b) { return a | b }
function XOR(a, b) { return a ^ b }

/***********************
 * D FLIP-FLOP (1 BIT)
 ***********************/
function DFlipFlop() {
  let q = 0
  return {
    clock: (d, clk) => { if (clk === 1) q = d },
    read: () => q
  }
}

/***********************
 * 4-BIT REGISTER
 ***********************/
function Register4() {
  const ff = [
    DFlipFlop(),
    DFlipFlop(),
    DFlipFlop(),
    DFlipFlop()
  ]

  return {
    load(bits, clk) {
      for (let i = 0; i < 4; i++) ff[i].clock(bits[i], clk)
    },
    read() {
      return ff.map(f => f.read())
    }
  }
}

/***********************
 * FULL ADDER (1 BIT)
 ***********************/
function FullAdder(a, b, cin) {
  const s1 = XOR(a, b)
  const sum = XOR(s1, cin)

  const c1 = AND(a, b)
  const c2 = AND(s1, cin)
  const cout = OR(c1, c2)

  return { sum, cout }
}

/***********************
 * 1-BIT ALU
 * OP:
 * 00 AND
 * 01 OR
 * 10 ADD
 * 11 XOR
 ***********************/
function ALU1(a, b, cin, op) {
  const andO = AND(a, b)
  const orO  = OR(a, b)
  const xorO = XOR(a, b)
  const add  = FullAdder(a, b, cin)

  const r0 = AND(andO, AND(NOT(op[0]), NOT(op[1])))
  const r1 = AND(orO,  AND(NOT(op[0]), op[1]))
  const r2 = AND(add.sum, AND(op[0], NOT(op[1])))
  const r3 = AND(xorO, AND(op[0], op[1]))

  return {
    result: OR(OR(r0, r1), OR(r2, r3)),
    cout: add.cout
  }
}

/***********************
 * 4x4 RAM
 ***********************/
function RAM4() {
  const mem = [
    Register4(),
    Register4(),
    Register4(),
    Register4()
  ]

  return {
    write(addr, data, clk) {
      mem[addr].load(data, clk)
    },
    read(addr) {
      return mem[addr].read()
    }
  }
}

/***********************
 * 8x8 ROM (PROGRAM)
 ***********************/
function ROM8() {
  // [ OPCODE(2) | ADDR(2) | UNUSED(4) ]
  const rom = [
    [0,0, 0,0, 0,0,0,0], // LOAD RAM[0] → A
    [1,0, 0,0, 0,0,0,0], // ADD A+B
    [0,1, 0,1, 0,0,0,0], // STORE A → RAM[1]
    [1,1, 0,0, 0,0,0,0], // XOR A,B
    [0,0, 0,0, 0,0,0,0],
    [0,0, 0,0, 0,0,0,0],
    [0,0, 0,0, 0,0,0,0],
    [0,0, 0,0, 0,0,0,0]
  ]

  return {
    read(addr) {
      return rom[addr]
    }
  }
}

/***********************
 * CONTROL UNIT
 ***********************/
function ControlUnit(op) {
  return {
    LOAD:  AND(NOT(op[0]), NOT(op[1])),
    STORE: AND(NOT(op[0]), op[1]),
    ADD:   AND(op[0], NOT(op[1])),
    XOR:   AND(op[0], op[1])
  }
}

/***********************
 * CPU (1-BIT)
 ***********************/
function CPU() {
  const A  = DFlipFlop()
  const B  = DFlipFlop()
  const PC = DFlipFlop()

  const ram = RAM4()
  const rom = ROM8()

  let clk = 1

  // preload RAM
  ram.write(0, [1,0,0,0], clk) // RAM[0] = 1
  ram.write(1, [0,0,0,0], clk)

  return {
    step() {
      const pc = PC.read()
      const instr = rom.read(pc)

      const opcode = [instr[0], instr[1]]
      const addr = OR(instr[3], AND(instr[2], 1))

      const ctrl = ControlUnit(opcode)

      if (ctrl.LOAD) {
        const data = ram.read(addr)
        A.clock(data[0], clk)
      }

      if (ctrl.ADD) {
        const alu = ALU1(A.read(), B.read(), 0, [1,0])
        A.clock(alu.result, clk)
      }

      if (ctrl.XOR) {
        const alu = ALU1(A.read(), B.read(), 0, [1,1])
        A.clock(alu.result, clk)
      }

      if (ctrl.STORE) {
        ram.write(addr, [A.read(),0,0,0], clk)
      }

      PC.clock(XOR(pc, 1), clk) // increment PC
    },

    debug() {
      console.log({
        A: A.read(),
        B: B.read(),
        PC: PC.read(),
        RAM0: ram.read(0)[0],
        RAM1: ram.read(1)[0]
      })
    }
  }
}

/***********************
 * RUN CPU
 ***********************/
const cpu = CPU()

cpu.debug()
cpu.step()
cpu.debug()
cpu.step()
cpu.debug()
cpu.step()
cpu.debug()
cpu.step()
cpu.debug()
