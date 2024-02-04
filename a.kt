package com.example.gps;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.Toast;

import com.example.gps.databinding.ActivityUploadPaperBinding;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import com.google.firebase.storage.UploadTask;

import java.util.HashMap;

public class UploadPaper extends AppCompatActivity {

    ActivityUploadPaperBinding bind;
    ActivityResultLauncher<Intent> launcher;
    Uri fileUri;
    HashMap<String,String> paperDetails;
    String department, semester, subject, year, fileName, filePath;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        bind = ActivityUploadPaperBinding.inflate(getLayoutInflater());
        setContentView(bind.getRoot());

        registerIntent();

        bind.selectFileBtn.setOnClickListener(View ->{
            Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType("application/*");
            launcher.launch(i);
        });

        bind.uploadBtn.setOnClickListener(View ->{
            if (fileUri != null){
                bind.progressBar.setVisibility(android.view.View.VISIBLE);
                paperDetails = new HashMap<>();
                department = bind.departmentField.getText().toString();
                subject = bind.subjectField.getText().toString();
                semester = bind.semesterField.getText().toString();
                year = bind.yearField.getText().toString();
                fileName = department+""+semester+""+subject+"_"+year;

                paperDetails.put("dept",department);
                paperDetails.put("paperName",fileName);
                paperDetails.put("sem",semester);
                paperDetails.put("subject",subject);
                paperDetails.put("year",year);

                uploadPaper(fileUri,paperDetails);
            }else{
                Toast.makeText(this, "Please select file first !", Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void uploadPaper(Uri fileUri, HashMap<String, String> paperDetails) {
        StorageReference str = FirebaseStorage.getInstance().getReference("Papers");
        str.child(paperDetails.get("paperName")).putFile(fileUri).addOnCompleteListener(new OnCompleteListener<UploadTask.TaskSnapshot>() {
            @Override
            public void onComplete(@NonNull Task<UploadTask.TaskSnapshot> task) {
                if (task.isComplete()){
                    Toast.makeText(UploadPaper.this, "uploaded", Toast.LENGTH_SHORT).show();
                    str.child(paperDetails.get("paperName")).getDownloadUrl().addOnSuccessListener(new OnSuccessListener<Uri>() {
                        @Override
                        public void onSuccess(Uri uri) {
                            paperDetails.put("paperUrl",uri.toString());
                            insertPaperRecord(paperDetails);
                        }
                    }).addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(@NonNull Exception e) {
                            bind.progressBar.setVisibility(View.GONE);
                            Log.d("getDownloadLinkError",e.getMessage());
                            Toast.makeText(UploadPaper.this, e.getMessage(), Toast.LENGTH_SHORT).show();
                        }
                    });
                }
            }
        }).addOnFailureListener(new OnFailureListener() {
            @Override
            public void onFailure(@NonNull Exception e) {
                Log.d("uploadFileError",e.getMessage());
                bind.progressBar.setVisibility(View.GONE);
                Toast.makeText(UploadPaper.this, e.getMessage(), Toast.LENGTH_SHORT).show();
            }
        });
    }

    private void insertPaperRecord(HashMap<String, String> paperDetails) {
        Toast.makeText(this, "948488844", Toast.LENGTH_SHORT).show();
        FirebaseDatabase.getInstance().getReference("papers").child(paperDetails.get("paperName"))
                .setValue(paperDetails).addOnCompleteListener(new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        bind.progressBar.setVisibility(View.GONE);
                        Toast.makeText(UploadPaper.this, "Record inserted succesfully !", Toast.LENGTH_SHORT).show();
                    }
                }).addOnFailureListener(new OnFailureListener() {
                    @Override
                    public void onFailure(@NonNull Exception e) {
                        bind.progressBar.setVisibility(View.GONE);
                        Log.d("insertDataError",e.getMessage());
                    }
                });
    }

    public void registerIntent(){
        launcher = registerForActivityResult(new ActivityResultContracts.StartActivityForResult(),
                new ActivityResultCallback<ActivityResult>() {
                    @Override
                    public void onActivityResult(ActivityResult result) {
                        if (result.getResultCode() == Activity.RESULT_OK && result.getData() != null){
                            bind.filePathTv.setText(result.getData().getData().toString());
                            fileUri = result.getData().getData();
                            Toast.makeText(UploadPaper.this, "File selected !", Toast.LENGTH_SHORT).show();
                        }else{
                            startActivity(new Intent(UploadPaper.this, UploadPaper.class));
                            finish();
                        }
                    }
                });
    }
}