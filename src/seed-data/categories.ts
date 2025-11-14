import { Category } from '@/lib/server-types';

export const cat_fpgaDev: Category = { 
    id: 'fpga-development', 
    name: 'FPGA Development', 
    slug: 'fpga-development', 
    icon: 'Cpu', 
    parentId: null, 
    description: 'Learn the fundamentals of FPGA design.' 
};

export const subcat_verilog: Category = { 
    id: 'verilog-hdl', 
    name: 'Verilog HDL', 
    slug: 'verilog-hdl', 
    icon: 'BookOpen', 
    parentId: cat_fpgaDev.id, 
    description: 'Master the Verilog HDL for digital design.' 
};

export const subcat_vhdl: Category = { 
    id: 'vhdl', 
    name: 'VHDL', 
    slug: 'vhdl', 
    icon: 'Binary', 
    parentId: cat_fpgaDev.id, 
    description: 'Explore the VHDL language.' 
};

export const subcat2_fsm: Category = { 
    id: 'fsm-design', 
    name: 'FSM Design', 
    slug: 'fsm-design', 
    icon: 'CircuitBoard', 
    parentId: subcat_verilog.id, 
    description: 'Design and implement Finite State Machines.' 
};

export const initialCategories: Category[] = [cat_fpgaDev, subcat_verilog, subcat_vhdl, subcat2_fsm];