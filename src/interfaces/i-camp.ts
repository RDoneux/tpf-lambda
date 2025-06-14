export interface ICamp {
  details: {
    name: string;
    description: string;
    code: string;
  };
  copper: number;
}

export const initialCampState: ICamp = {
  details: {
    name: "",
    description: "",
    code: "",
  },
  copper: 0
};
