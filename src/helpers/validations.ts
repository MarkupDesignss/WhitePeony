import * as Yup from "yup";

const VerifyNumberValidationSchema = Yup.object().shape({
  mobilePhone: Yup.string().required("Please enter mobile number"),
});
const VerifyOTPValidationSchema = Yup.object().shape({
  code: Yup.string().required("Please enter otp"),
});

const BusinessValidationSchema = Yup.object().shape({
  businessName: Yup.string().required("Please enter business name"),
  businessType: Yup.string().required("Please enter buisness type"),
  serviceArea: Yup.string().required("Please select service area"),
  vehicleType: Yup.string().required("Please select vehicle type"),
  vehicleNumber: Yup.string().required("Please enter vehicle number"),
  dlNumber: Yup.string().required("Please enter dl number"),
  gstNumber: Yup.string().required("Please enter gst number"),
  vehicleSize: Yup.string().required("Please enter vehicle size"),
  sizeOfBucket: Yup.string().required("Please enter size of bucket"),
  loadingCapacity: Yup.string().required("Please enter loading capacity"),
});
export {
  VerifyNumberValidationSchema,
  VerifyOTPValidationSchema,
  BusinessValidationSchema,
};
